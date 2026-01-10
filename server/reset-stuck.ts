import { prisma } from './src/db';

async function main() {
  const articles = await prisma.ingestedArticle.findMany({
    where: { analysisStatus: 'screening' },
    select: { id: true, title: true }
  });
  console.log('Stuck articles:', JSON.stringify(articles, null, 2));
  
  if (articles.length > 0) {
    await prisma.ingestedArticle.updateMany({
      where: { analysisStatus: 'screening' },
      data: { analysisStatus: 'pending' }
    });
    console.log('Reset', articles.length, 'articles to pending');
  }
  await prisma.$disconnect();
}
main();
