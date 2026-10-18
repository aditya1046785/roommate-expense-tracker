import "dotenv/config";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";

function askQuestion(readline, question) {
  return new Promise((resolve) => readline.question(question, resolve));
}

function askForPassword(readline, question) {
  return new Promise((resolve) => {
    const terminalOutput = readline.output;
    const originalWrite = terminalOutput.write.bind(terminalOutput);
    terminalOutput.write = (chunk, ...argumentsList) => {
      const text = chunk.toString();
      const result = originalWrite(text.includes(question) ? question : text.replace(/[^\r\n]/g, ""), ...argumentsList);
      return result;
    };

    readline.question(question, (password) => {
      terminalOutput.write = originalWrite;
      terminalOutput.write("\n");
      resolve(password);
    });
  });
}

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing. Add it to .env.local before running this script.`);
  }
  return value;
}

async function promptForAccount(readline, label, defaultName, defaultEmail, role) {
  const nameInput = await askQuestion(readline, `${label} name [${defaultName}]: `);
  const emailInput = await askQuestion(readline, `${label} email [${defaultEmail}]: `);
  const name = nameInput.trim() || defaultName;
  const email = (emailInput.trim() || defaultEmail).toLowerCase();
  const password = await askForPassword(readline, `${label} password: `);

  if (!name || !email.includes("@") || password.length < 8) {
    throw new Error(`${label} needs a name, a valid email, and a password with at least 8 characters.`);
  }

  return { name, email, password, role };
}

async function main() {
  const supabaseUrl = getRequiredEnvironmentVariable("SUPABASE_URL");
  const serviceRoleKey = getRequiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const readline = createInterface({ input, output, terminal: true });

  try {
    console.log("Create the admin account and three roommate accounts.");
    console.log("For existing accounts, enter the same email to update their name, role, and password.\n");

    const accounts = [];
    accounts.push(await promptForAccount(readline, "Admin", "Household Admin", "admin@example.com", "admin"));
    accounts.push(await promptForAccount(readline, "Roommate 1", "Roommate One", "roommate1@example.com", "user"));
    accounts.push(await promptForAccount(readline, "Roommate 2", "Roommate Two", "roommate2@example.com", "user"));
    accounts.push(await promptForAccount(readline, "Roommate 3", "Roommate Three", "roommate3@example.com", "user"));

    for (const account of accounts) {
      const passwordHash = await bcrypt.hash(account.password, 12);
      const { error } = await supabase.from("users").upsert({
        name: account.name,
        email: account.email,
        password_hash: passwordHash,
        role: account.role,
      }, { onConflict: "email" });

      if (error) {
        throw new Error(`Could not save ${account.email}: ${error.message}`);
      }
      console.log(`Saved ${account.role} account: ${account.email}`);
    }

    const { error: settingsError } = await supabase
      .from("room_settings")
      .upsert({ id: true, roommate_count: 3 }, { onConflict: "id" });
    if (settingsError) {
      throw new Error(`Accounts were created, but roommate count could not be set: ${settingsError.message}`);
    }

    console.log("\nFinished. Keep the passwords private; they are stored as bcrypt hashes.");
  } finally {
    readline.close();
  }
}

main().catch((error) => {
  console.error("Error creating accounts:", error.message);
  process.exitCode = 1;
});
