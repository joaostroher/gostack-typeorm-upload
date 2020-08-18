import csvParse from 'csv-parse';
import fs from 'fs';
import { getRepository, getCustomRepository, In } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CSVTransaction {
  title: Transaction['title'];
  type: Transaction['type'];
  value: Transaction['value'];
  category: string;
}

class ImportTransactionsService {
  async execute(path: string): Promise<Transaction[]> {
    const transactionReadStream = fs.createReadStream(path);

    const parser = csvParse({
      from_line: 2,
    });

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    const parse = transactionReadStream.pipe(parser);
    parse.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;
      if (!categories.includes(category)) categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parse.on('end', resolve));

    // Category
    const categoriesRepository = getRepository(Category);
    const existentCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });
    const existentCategoriesTitles = existentCategories.map(
      category => category.title,
    );
    const categoriesToAdd = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .map(title => ({ title }));
    const newCategories = categoriesRepository.create(categoriesToAdd);
    await categoriesRepository.save(newCategories);
    const allCategories = [...existentCategories, ...newCategories];

    // Transaction
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const newTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        ...transaction,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(newTransactions);

    await fs.promises.unlink(path);

    return newTransactions;
  }
}

export default ImportTransactionsService;
