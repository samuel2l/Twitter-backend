import { Kafka, type Consumer, type Producer } from "kafkajs";
import { env } from "./env.js";

let kafka: Kafka | null = null;
let producer: Producer | null = null;
let producerConnectFailed = false;

function getKafka(): Kafka | null {
  if (!env.kafkaEnabled) return null;

  if (!kafka) {
    kafka = new Kafka({
      clientId: env.kafkaClientId,
      brokers: env.kafkaBrokers,
      retry: {
        initialRetryTime: 300,
        retries: 5,
      },
    });
  }

  return kafka;
}

export async function getKafkaProducer(): Promise<Producer | null> {
  if (!env.kafkaEnabled || producerConnectFailed) return null;

  const client = getKafka();
  if (!client) return null;

  if (!producer) {
    producer = client.producer();
    try {
      await producer.connect();
    } catch (error) {
      producerConnectFailed = true;
      console.warn(
        "[kafka] producer unavailable — falling back to inline ML:",
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  return producer;
}

export function createKafkaConsumer(groupId: string): Consumer | null {
  const client = getKafka();
  if (!client) return null;

  return client.consumer({ groupId });
}

export async function disconnectKafka(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }

  kafka = null;
  producerConnectFailed = false;
}

export async function pingKafka(): Promise<"ok" | "disabled" | "unavailable"> {
  if (!env.kafkaEnabled) return "disabled";

  const client = getKafka();
  if (!client) return "unavailable";

  try {
    const admin = client.admin();
    await admin.connect();
    await admin.listTopics();
    await admin.disconnect();
    return "ok";
  } catch {
    return "unavailable";
  }
}
