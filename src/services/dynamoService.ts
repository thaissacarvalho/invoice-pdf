import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';

dotenv.config();
const TABLE_NAME = process.env.TABLE_NAME as string;
const dynamoDB = new DynamoDBClient({ region: process.env.REGION });

export class DynamoService {
  async saveToDynamoDB(data: any) {
    try {
      const formattedData: any = {
        id: { S: data.id },
        numeroInstalacao: data.numeroInstalacao ? { S: data.numeroInstalacao } : { NULL: true },
        endereco: data.endereco ? { S: data.endereco } : { NULL: true },
        dataReferencia: data.dataReferencia ? { S: data.dataReferencia } : { NULL: true },
        datasLeitura: data.datasLeitura
          ? { M: { anterior: { S: data.datasLeitura.anterior }, atual: { S: data.datasLeitura.atual } } }
          : { NULL: true },
        totalPagar: data.totalPagar ? { S: data.totalPagar } : { NULL: true },
        itemsInvoice: data.itemsInvoice?.length
          ? { L: data.itemsInvoice.map((item: string) => ({ S: item })) }
          : { NULL: true },
        extraidoEm: { S: data.extraidoEm }
      };

      const params = {
        TableName: TABLE_NAME,
        Item: formattedData
      };

      const command = new PutItemCommand(params);
      await dynamoDB.send(command);
      console.log('Item successfully saved to DynamoDB');
      return data;
    } catch (error) {
      console.error('Error saving item to DynamoDB:', error);
      throw new Error('Error saving to DynamoDB');
    }
  }

  async getFromDynamoDB(id: string) {
    try {
      const params = {
        TableName: TABLE_NAME,
        Key: {
          id: { S: id }
        },
      };

      const command = new GetItemCommand(params);
      const result = await dynamoDB.send(command);
      if (!result.Item) {
        console.log('Item not found.');
        return null;
      }

      const item = this.formatItem(result.Item);
      console.log('Item found:', item);
      return item;
    } catch (error) {
      console.error('Error getting item from DynamoDB:', error);
      throw new Error('Error fetching from DynamoDB');
    }
  }

  private formatItem(item: any) {
    return {
      id: item.id.S,
      numeroInstalacao: item.numeroInstalacao?.S || null,
      endereco: item.endereco?.S || null,
      dataReferencia: item.dataReferencia?.S || null,
      datasLeitura: item.datasLeitura?.M || null,
      totalPagar: item.totalPagar?.S || null,
      itemsInvoice: item.itemsInvoice?.L.map((el: any) => el.S) || [],
      extraidoEm: item.extraidoEm?.S || null,
    };
  }
}