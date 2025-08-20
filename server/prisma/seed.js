const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tradekeep.com' },
    update: {},
    create: {
      email: 'admin@tradekeep.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create editor user
  const editorPassword = await bcrypt.hash('editor123', 10);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@tradekeep.com' },
    update: {},
    create: {
      email: 'editor@tradekeep.com',
      name: 'Content Editor',
      password: editorPassword,
      role: 'EDITOR',
    },
  });

  console.log('👥 Created users:', { admin: admin.email, editor: editor.email });

  // Sample content data
  const sampleContent = [
    {
      title: 'Building Trust Through Consistency',
      body: 'Consistency is the foundation of trust in trading. When you consistently follow your trading plan, manage risk properly, and maintain discipline, you build trust not only with yourself but with the market. This trust becomes your competitive advantage.',
      type: 'post',
      status: 'published',
      pillar: 'internal-os',
      platform: 'linkedin',
      publishedAt: new Date('2024-01-15'),
    },
    {
      title: 'The Psychology of Risk Management',
      body: 'Risk management is not just about position sizing and stop losses. It is fundamentally about understanding your psychological relationship with uncertainty. The best traders master their emotions before they master the markets.',
      type: 'social',
      status: 'published',
      pillar: 'psychology',
      platform: 'twitter',
      publishedAt: new Date('2024-01-14'),
    },
    {
      title: 'Systems vs Reactive Trading',
      body: 'Reactive trading is emotional trading. Systematic trading is logical trading. The difference between success and failure often comes down to whether you follow a proven system or react to market emotions.',
      type: 'post',
      status: 'scheduled',
      pillar: 'systems',
      platform: 'instagram',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    {
      title: 'Discipline Over Dopamine',
      body: 'The markets will try to seduce you with quick profits and exciting moves. But sustainable success comes from choosing discipline over the dopamine hit of impulsive trades. Build systems that reward patience.',
      type: 'email',
      status: 'draft',
      pillar: 'discipline',
    },
    {
      title: 'Your Internal Operating System',
      body: 'Your trading results are outputs of your internal operating system. If you want better results, you need to upgrade your internal processes: your beliefs, habits, decision-making frameworks, and emotional regulation.',
      type: 'post',
      status: 'review',
      pillar: 'internal-os',
      platform: 'linkedin',
    },
  ];

  // Create sample content
  for (const content of sampleContent) {
    await prisma.content.create({
      data: {
        ...content,
        authorId: Math.random() > 0.5 ? admin.id : editor.id,
      },
    });
  }

  console.log('📝 Created sample content pieces');

  // Create a sample campaign
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Q1 Trading Psychology Series',
      description: 'A comprehensive content series focusing on the psychological aspects of trading success.',
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      createdById: admin.id,
    },
  });

  console.log('📅 Created sample campaign:', campaign.name);

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });