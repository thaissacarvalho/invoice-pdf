import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import dotenv from 'dotenv';

dotenv.config();

const sqs = new SQSClient({ region: process.env.REGION });
const QUEUE_URL = process.env.SQS_URL as string;

export class SQSService {
  // Enviar uma mensagem para a fila
  async sendMessage(message: string) {
    const params = {
      QueueUrl: QUEUE_URL,
      MessageBody: message,
    };

    try {
      const data = await sqs.send(new SendMessageCommand(params));
      console.log('Message sent:', data.MessageId);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  // Receber mensagens da fila
  async receiveMessage() {
    const params = {
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,  // Receber até 10 mensagens de uma vez
      WaitTimeSeconds: 20,       // Long polling por até 20 segundos
    };

    try {
      const data = await sqs.send(new ReceiveMessageCommand(params));

      if (data.Messages) {
        data.Messages.forEach(async (message) => {
          console.log('Received message:', message.Body);

          // Processar a mensagem (por exemplo, extrair dados do PDF)
          // Aqui você pode chamar a função de processamento, como extrair dados e salvar no DynamoDB

          // Após processar, exclua a mensagem da fila
          await this.deleteMessage(message.ReceiptHandle!);
        });
      } else {
        console.log('No messages received');
      }
    } catch (error) {
      console.error('Error receiving message:', error);
    }
  }

  // Excluir uma mensagem da fila
  async deleteMessage(receiptHandle: string) {
    const params = {
      QueueUrl: QUEUE_URL,
      ReceiptHandle: receiptHandle,
    };

    try {
      await sqs.send(new DeleteMessageCommand(params));
      console.log('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }
}
