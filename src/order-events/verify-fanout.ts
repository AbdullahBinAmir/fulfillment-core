import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as amqp from 'amqplib';

// M9 acceptance check (build guide, Section 5), run as a script rather than
// a jest spec: @golevelup/nestjs-rabbitmq's @RabbitSubscribe discovery
// (reflection-metadata based) finds nothing when compiled through ts-jest in
// this project, even though the identical code works fine under ts-node —
// confirmed by direct rabbitmqctl checks, not a guess. A live script that
// boots the same three real consumer processes this project actually ships
// is a more honest acceptance check here than a jest test that can't
// exercise real AMQP consumption in the first place.

interface ConsumerTarget {
  name: string;
  script: string;
  readyMarker: string;
}

const CONSUMERS: ConsumerTarget[] = [
  {
    name: 'shipping-service',
    script: 'src/shipping-service-main.ts',
    readyMarker: 'started, pid=',
  },
  {
    name: 'order-analytics-service',
    script: 'src/order-analytics-service-main.ts',
    readyMarker: 'started, pid=',
  },
  {
    name: 'fraud-detection',
    script: 'src/fraud-detection-service-main.ts',
    readyMarker: 'started, pid=',
  },
];

const TS_NODE_BIN = path.join(
  __dirname,
  '..',
  '..',
  'node_modules',
  '.bin',
  'ts-node',
);

function spawnConsumer(target: ConsumerTarget): {
  proc: ChildProcess;
  output: () => string;
} {
  // Spawn ts-node's bin directly, NOT via `npx` — npx interposes its own
  // process, and killing that wrapper doesn't kill the ts-node process it
  // execs, leaving an orphaned, still-consuming process behind. Confirmed
  // the hard way: a prior run of this exact script left three orphaned
  // ts-node processes running for hours, silently stealing messages meant
  // for freshly-started consumers in a later experiment.
  const proc = spawn(
    TS_NODE_BIN,
    ['-r', 'tsconfig-paths/register', target.script],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let buffer = '';
  proc.stdout?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
  });
  proc.stderr?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
  });
  return { proc, output: () => buffer };
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  description: string,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for: ${description}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function main() {
  const consumers = CONSUMERS.map((target) => ({
    target,
    ...spawnConsumer(target),
  }));

  try {
    console.log('[verify] booting three consumer processes...');
    for (const c of consumers) {
      await waitFor(
        () => c.output().includes(c.target.readyMarker),
        15000,
        `${c.target.name} to boot`,
      );
    }
    // give @golevelup a moment past process-ready to finish asserting
    // queues/bindings and start consuming
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('[verify] all three consumers are up');

    const orderId = `m9-verify-${Date.now()}`;
    const conn = await amqp.connect(
      process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    );
    const channel = await conn.createChannel();
    channel.publish(
      'orders',
      'order.eu.placed',
      Buffer.from(JSON.stringify({ orderId })),
      { contentType: 'application/json' },
    );
    console.log(`[verify] published order.eu.placed for ${orderId}`);
    await channel.close();
    await conn.close();

    for (const c of consumers) {
      await waitFor(
        () => c.output().includes(orderId),
        5000,
        `${c.target.name} to receive ${orderId}`,
      );
      console.log(`[verify] OK: ${c.target.name} received its own copy`);
    }

    console.log(
      '[verify] PASS — one publish reached all three independent consumers',
    );
  } finally {
    for (const c of consumers) {
      c.proc.kill('SIGKILL');
    }
  }
}

main().catch((err) => {
  console.error('[verify] FAIL:', err);
  process.exit(1);
});
