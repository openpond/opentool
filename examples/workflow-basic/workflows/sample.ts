export async function helloWorkflow(name: string) {
  "use workflow";

  const greeting = await buildGreeting(name);
  await recordGreeting(greeting);
  return greeting;
}

async function buildGreeting(name: string) {
  "use step";
  return `Hello, ${name}!`;
}

async function recordGreeting(message: string) {
  "use step";
  console.log("Greeting recorded", { message });
}
