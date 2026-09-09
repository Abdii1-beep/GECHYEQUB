import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.user.findMany({ 
  where: { email: { in: ['admin@ethiolottery.com', 'user@ethiolottery.com'] } }, 
  select: { email: true, role: true, status: true } 
}).then(u => { 
  console.log(JSON.stringify(u, null, 2)); 
  p.$disconnect(); 
});
