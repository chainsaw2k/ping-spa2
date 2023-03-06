import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const { name } = request.query;
  console.log(`hello ${name}`)
  return response.end(`Hello ${name}!`);
}
