import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface CreateTransactionServiceDTO {
  title: Transaction['title'];
  type: Transaction['type'];
  value: Transaction['value'];
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category: inputCategory,
  }: CreateTransactionServiceDTO): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const { total } = await transactionsRepository.getBalance();
    if (type === 'outcome' && total < value)
      throw new AppError(
        "You can't create outcome transaction without a valid balance.",
      );

    // Find or create a category
    const categoryRepository = getRepository(Category);
    let category = await categoryRepository.findOne({
      where: {
        title: inputCategory,
      },
    });
    if (!category) {
      category = categoryRepository.create({
        title: inputCategory,
      });
      await categoryRepository.save(category);
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category,
    });
    await transactionsRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
