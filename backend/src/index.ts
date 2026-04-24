import "./config"; // validate env at startup
import { config } from "./config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import {
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Contract,
  nativeToScVal,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import { SorobanRpc } from "@stellar/stellar-sdk";
import { globalLimiter, writeLimiter } from "./middleware/rateLimit";
import {
  registerWebhook,
  getWebhooks,
  getDeliveryLogs,
  fireWebhooks,
} from "./webhooks";

const { Server } = SorobanRpc;

const app = express();
app.use(cors());
app.use(express.json());
app.use(globalLimiter);

const RPC_URL = config.RPC_URL;
const CONTRACT_ID = config.CONTRACT_ID;
const NETWORK_PASSPHRASE =
  config.NEXT_PUBLIC_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

const server = new Server(RPC_URL);

// ── helpers ──────────────────────────────────────────────────────────────────
async function buildContractTx(
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[]
): Promise<string> {
  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

// ── routes ────────────────────────────────────────────────────────────────────

// POST /api/collateral/register
app.post("/api/collateral/register", writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, animal_type, count, appraised_value } = req.body;
    const xdrTx = await buildContractTx(owner, "register_livestock", [
      new Address(owner).toScVal(),
      nativeToScVal(animal_type, { type: "symbol" }),
      nativeToScVal(count, { type: "u32" }),
      nativeToScVal(BigInt(appraised_value), { type: "i128" }),
    ]);
    res.json({ xdr: xdrTx });
  } catch (e) {
    next(e);
  }
});

// POST /api/loan/request
app.post("/api/loan/request", writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { borrower, collateral_id, amount } = req.body;
    const xdrTx = await buildContractTx(borrower, "request_loan", [
      new Address(borrower).toScVal(),
      nativeToScVal(BigInt(collateral_id), { type: "u64" }),
      nativeToScVal(BigInt(amount), { type: "i128" }),
    ]);
    res.json({ xdr: xdrTx });
    fireWebhooks("loan.requested", { borrower, collateral_id, amount });
  } catch (e) {
    next(e);
  }
});

// POST /api/loan/repay
app.post("/api/loan/repay", writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { borrower, loan_id, amount } = req.body;
    const xdrTx = await buildContractTx(borrower, "repay_loan", [
      new Address(borrower).toScVal(),
      nativeToScVal(BigInt(loan_id), { type: "u64" }),
      nativeToScVal(BigInt(amount), { type: "i128" }),
    ]);
    res.json({ xdr: xdrTx });
    fireWebhooks("loan.repaid", { borrower, loan_id, amount });
  } catch (e) {
    next(e);
  }
});

// GET /api/loan/:id
app.get("/api/loan/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
    );
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call("get_loan", nativeToScVal(BigInt(req.params.id), { type: "u64" }))
      )
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    res.json({ result: (result as any).result?.retval });
  } catch (e) {
    next(e);
  }
});

// GET /api/health/:loanId
app.get("/api/health/:loanId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
    );
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "health_factor",
          nativeToScVal(BigInt(req.params.loanId), { type: "u64" })
        )
      )
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    res.json({ health_factor: (result as any).result?.retval });
  } catch (e) {
    next(e);
  }
});

// ── webhook routes ────────────────────────────────────────────────────────────

// POST /api/webhooks — register a webhook URL
app.post("/api/webhooks", (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }
  const reg = registerWebhook(url);
  res.status(201).json(reg);
});

// GET /api/admin/webhooks — list registered webhooks
app.get("/api/admin/webhooks", (req: Request, res: Response) => {
  res.json(getWebhooks());
});

// GET /api/admin/webhooks/logs — delivery logs
app.get("/api/admin/webhooks/logs", (req: Request, res: Response) => {
  res.json(getDeliveryLogs());
});

// ── error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = parseInt(config.PORT, 10);
app.listen(PORT, () => console.log(`StellarKraal API running on :${PORT}`));

export default app;
