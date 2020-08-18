import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    return transactions.reduce<Balance>(
      (balance, transaction) => {
        if (transaction.type === 'income') {
          return {
            ...balance,
            income: balance.income + transaction.value,
            total: +balance.total + transaction.value,
          };
        }
        if (transaction.type === 'outcome') {
          return {
            ...balance,
            outcome: balance.outcome + transaction.value,
            total: balance.total - transaction.value,
          };
        }
        return balance;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );
  }
}

export default TransactionsRepository;
