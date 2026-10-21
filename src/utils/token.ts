import { randomInt } from 'crypto'

export const generateToken = () => randomInt(100000, 1000000).toString()