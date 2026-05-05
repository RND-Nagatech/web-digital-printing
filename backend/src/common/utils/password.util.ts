import * as bcrypt from 'bcrypt';

export const hashPassword = (password: string, rounds: number): Promise<string> => bcrypt.hash(password, rounds);
export const comparePassword = (password: string, hash: string): Promise<boolean> => bcrypt.compare(password, hash);
