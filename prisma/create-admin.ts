import "dotenv/config";
import * as readline from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/password.ts";

// Bootstraps an "Admin" user (the /admin console role). Run: npm run create-admin.
// Prompts interactively; see --help for the flags/env that pre-answer each one.

// Connected lazily so bad arguments (and --help) are reported before the
// environment is consulted, and so nothing dials the database on --help.
let client: PrismaClient | undefined;
function db(): PrismaClient {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set.");
    client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return client;
}

const MIN_PASSWORD_LENGTH = 8;
// Caps every re-ask loop so a typo-prone answer can't spin forever.
const MAX_ATTEMPTS = 3;

type Args = {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  force: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    // --flag=value and --flag value are both accepted.
    const eq = arg.indexOf("=");
    const [flag, inlineValue] = eq === -1 ? [arg, undefined] : [arg.slice(0, eq), arg.slice(eq + 1)];
    const next = () => {
      const value = inlineValue ?? argv[++i];
      if (value == null) throw new Error(`${flag} requires a value.`);
      return value;
    };
    if (flag === "--help" || flag === "-h") {
      console.log(
        "Usage: npm run create-admin\n" +
          "  Prompts for email, name, and password.\n\n" +
          "  Optional (skips the matching prompt):\n" +
          "    --email <email>        also ADMIN_EMAIL\n" +
          "    --password <password>  also ADMIN_PASSWORD\n" +
          "    --first-name <name>\n" +
          "    --last-name <name>\n" +
          "    --force                answer the confirmation prompts yes\n\n" +
          "  Prompting needs a TTY. Without one, pass --email, --password, and --force.",
      );
      process.exit(0);
    }
    switch (flag) {
      case "--email": args.email = next(); break;
      case "--password": args.password = next(); break;
      case "--first-name": args.first_name = next(); break;
      case "--last-name": args.last_name = next(); break;
      case "--force": args.force = true; break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

// One readline interface for the whole run, created on first use. A TTY is
// required: a buffered pipe's type-ahead lines are lost, silently dropping answers.
const interactive = process.stdin.isTTY === true;

let rl: readline.Interface | undefined;
let muted = false;
let inputClosed: Promise<never> | undefined;

function ui(): readline.Interface {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // readline has no public mute switch, so override its output hook to swallow
    // the echo while a password is typed. question() writes the prompt first.
    (rl as unknown as { _writeToOutput: (chunk: string) => void })._writeToOutput = (chunk: string) => {
      if (!muted) process.stdout.write(chunk);
    };
    // A pending question never settles once stdin ends (Ctrl-D), which would
    // leave the event loop empty and exit 0 without doing anything.
    inputClosed = new Promise((_resolve, reject) => {
      rl!.once("close", () => reject(new Error("Input closed before every prompt was answered.")));
    });
    // The close at the end of a successful run is expected, not a failure.
    inputClosed.catch(() => {});
  }
  return rl;
}

// Rejects rather than hanging if stdin ends mid-prompt.
async function prompt(question: string, secret = false): Promise<string> {
  const iface = ui();
  const answer = iface.question(question);
  muted = secret;
  try {
    return await Promise.race([answer, inputClosed as Promise<never>]);
  } finally {
    if (secret) {
      muted = false;
      // The newline the user typed was swallowed along with the echo.
      process.stdout.write("\n");
    }
  }
}

async function ask(question: string): Promise<string> {
  return (await prompt(question)).trim();
}

// Not trimmed: leading/trailing whitespace is legitimate in a password.
async function askSecret(question: string): Promise<string> {
  return prompt(question, true);
}

async function askYesNo(question: string): Promise<boolean> {
  const answer = (await ask(`${question} [y/N] `)).toLowerCase();
  return answer === "y" || answer === "yes";
}

function cannotPrompt(what: string, how: string): Error {
  return new Error(
    `${what} is required. stdin is not a terminal, so it cannot be prompted for — pass ${how}.`,
  );
}

function emailProblem(email: string): string | null {
  if (!email) return "Email is required.";
  if (!email.includes("@")) return `Not a valid email address: ${email}`;
  return null;
}

async function resolveEmail(fromArgs: string | undefined): Promise<string> {
  const supplied = (fromArgs ?? process.env.ADMIN_EMAIL ?? "").trim();
  if (supplied) {
    const problem = emailProblem(supplied);
    if (problem) throw new Error(problem);
    return supplied;
  }
  if (!interactive) throw cannotPrompt("Email", "--email or set ADMIN_EMAIL");

  for (let attempt = 1; ; attempt++) {
    const email = await ask("Email: ");
    const problem = emailProblem(email);
    if (!problem) return email;
    if (attempt >= MAX_ATTEMPTS) throw new Error(problem);
    console.error(problem);
  }
}

async function resolvePassword(fromArgs: string | undefined): Promise<string> {
  const supplied = fromArgs ?? process.env.ADMIN_PASSWORD;
  if (supplied) {
    if (supplied.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    return supplied;
  }
  if (!interactive) throw cannotPrompt("Password", "--password or set ADMIN_PASSWORD");

  for (let attempt = 1; ; attempt++) {
    const password = await askSecret("Password: ");
    const confirm = await askSecret("Confirm password: ");
    const problem =
      password.length < MIN_PASSWORD_LENGTH
        ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
        : password !== confirm
          ? "Passwords do not match."
          : null;
    if (!problem) return password;
    if (attempt >= MAX_ATTEMPTS) throw new Error(problem);
    console.error(problem);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = await resolveEmail(args.email);

  // Matches checkEmail()'s case-insensitive lookup, so an account is found even
  // when its stored email differs in case from what was typed.
  const existing = await db().user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { user_id: true, email: true, user_type: true },
  });

  if (existing && !args.force) {
    console.log(
      `A user already exists with email ${existing.email} (user_type ${existing.user_type}).`,
    );
    if (!interactive) {
      throw new Error(
        "Re-run with --force to promote it to Admin and reset its password.",
      );
    }
    if (!(await askYesNo("Promote it to Admin and reset its password?"))) {
      console.log("Aborted; nothing was changed.");
      return;
    }
  }

  // Names are optional, so a non-TTY run just leaves them empty/unchanged.
  const first_name = args.first_name ?? (interactive ? await ask("First name (optional): ") : "");
  const last_name = args.last_name ?? (interactive ? await ask("Last name (optional): ") : "");
  const password = await resolvePassword(args.password);

  // user_type "Admin" is what isAdmin reads (lib/auth.ts); is_active is the
  // login gate in auth.ts.
  const fields = {
    password: hashPassword(password),
    user_type: "Admin",
    is_active: true,
  } as const;

  if (existing) {
    const user = await db().user.update({
      where: { user_id: existing.user_id },
      data: {
        ...fields,
        // A blank answer at the prompt means "leave the stored name alone".
        ...(first_name ? { first_name } : {}),
        ...(last_name ? { last_name } : {}),
      },
      select: { user_id: true, email: true },
    });
    console.log(`Promoted ${user.email} to Admin and reset its password (user_id ${user.user_id}).`);
    return;
  }

  const user = await db().user.create({
    data: { email, ...fields, first_name, last_name },
    select: { user_id: true, email: true },
  });
  console.log(`Created admin ${user.email} (user_id ${user.user_id}).`);
}

main()
  .then(async () => {
    rl?.close();
    await client?.$disconnect();
  })
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    rl?.close();
    await client?.$disconnect();
    process.exit(1);
  });
