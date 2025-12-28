import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aicontentstudio.com' },
    update: {},
    create: {
      email: 'admin@aicontentstudio.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
      tier: 'ENTERPRISE',
    },
  })
  console.log('Created admin user:', admin.email)

  // Create demo user
  const demoPassword = await bcrypt.hash('demo123', 12)
  const demo = await prisma.user.upsert({
    where: { email: 'demo@aicontentstudio.com' },
    update: {},
    create: {
      email: 'demo@aicontentstudio.com',
      name: 'Demo User',
      password: demoPassword,
      role: 'USER',
      tier: 'PRO',
    },
  })
  console.log('Created demo user:', demo.email)

  // Create sample templates
  const templates = [
    {
      name: 'Product Demo Video',
      description: 'Professional product demonstration with AI avatar presenter',
      category: 'Marketing',
      type: 'VIDEO',
      config: {
        script: 'Introducing {{product_name}}, the revolutionary solution for {{problem}}...',
        voice: 'professional',
        avatar: 'business',
        variables: [
          { name: 'product_name', type: 'text', label: 'Product Name' },
          { name: 'problem', type: 'text', label: 'Problem it Solves' },
        ],
      },
      isPublic: true,
    },
    {
      name: 'Tutorial Explainer',
      description: 'Step-by-step tutorial format with clear explanations',
      category: 'Education',
      type: 'VIDEO',
      config: {
        script: 'In this tutorial, you will learn how to {{topic}}. Let\'s get started...',
        voice: 'friendly',
        avatar: 'casual',
        variables: [
          { name: 'topic', type: 'text', label: 'Tutorial Topic' },
        ],
      },
      isPublic: true,
    },
    {
      name: 'Podcast Intro',
      description: 'Engaging podcast introduction with music bed',
      category: 'Entertainment',
      type: 'AUDIO',
      config: {
        script: 'Welcome to {{podcast_name}}! I\'m your host, and today we\'re discussing {{topic}}...',
        voice: 'energetic',
        variables: [
          { name: 'podcast_name', type: 'text', label: 'Podcast Name' },
          { name: 'topic', type: 'text', label: 'Episode Topic' },
        ],
      },
      isPublic: true,
    },
    {
      name: 'Newsletter Weekly Digest',
      description: 'Curated weekly newsletter template with sections',
      category: 'Business',
      type: 'NEWSLETTER',
      config: {
        script: '# This Week in {{industry}}\n\n## Top Stories\n{{stories}}\n\n## Key Takeaways\n{{takeaways}}',
        variables: [
          { name: 'industry', type: 'text', label: 'Industry' },
          { name: 'stories', type: 'text', label: 'Top Stories' },
          { name: 'takeaways', type: 'text', label: 'Key Takeaways' },
        ],
      },
      isPublic: true,
    },
    {
      name: 'Social Media Script',
      description: 'Short-form video script for TikTok/Reels',
      category: 'Social Media',
      type: 'TEXT',
      config: {
        script: 'Hook: {{hook}}\n\nMain Content: {{content}}\n\nCTA: {{cta}}',
        variables: [
          { name: 'hook', type: 'text', label: 'Attention Hook' },
          { name: 'content', type: 'text', label: 'Main Content' },
          { name: 'cta', type: 'text', label: 'Call to Action' },
        ],
      },
      isPublic: true,
    },
    {
      name: 'Company Announcement',
      description: 'Professional company news and updates format',
      category: 'Business',
      type: 'VIDEO',
      config: {
        script: 'We are excited to announce {{announcement}}. This means {{impact}} for our customers...',
        voice: 'professional',
        avatar: 'corporate',
        variables: [
          { name: 'announcement', type: 'text', label: 'Announcement' },
          { name: 'impact', type: 'text', label: 'Customer Impact' },
        ],
      },
      isPublic: true,
    },
  ]

  for (const template of templates) {
    await prisma.template.upsert({
      where: {
        id: template.name.toLowerCase().replace(/\s+/g, '-'),
      },
      update: template,
      create: {
        id: template.name.toLowerCase().replace(/\s+/g, '-'),
        ...template,
        type: template.type as 'VIDEO' | 'AUDIO' | 'TEXT' | 'NEWSLETTER' | 'SOCIAL',
      },
    })
  }
  console.log('Created sample templates')

  // Create API endpoints for monitoring
  const endpoints = [
    { method: 'POST', path: '/api/v1/auth/login', description: 'User authentication' },
    { method: 'POST', path: '/api/v1/auth/register', description: 'User registration' },
    { method: 'GET', path: '/api/v1/content', description: 'List user content' },
    { method: 'POST', path: '/api/v1/content/generate', description: 'Generate AI content' },
    { method: 'POST', path: '/api/v1/claude/complete', description: 'Claude API completion' },
    { method: 'POST', path: '/api/v1/claude/script', description: 'Script generation' },
    { method: 'POST', path: '/api/v1/elevenlabs/tts', description: 'Text to speech' },
    { method: 'POST', path: '/api/v1/heygen/avatar', description: 'Avatar video generation' },
    { method: 'GET', path: '/api/v1/templates', description: 'List templates' },
    { method: 'POST', path: '/api/v1/newsletter/send', description: 'Send newsletter' },
    { method: 'GET', path: '/api/v1/analytics/metrics', description: 'Dashboard metrics' },
  ]

  for (const endpoint of endpoints) {
    await prisma.apiEndpoint.upsert({
      where: {
        method_path: {
          method: endpoint.method,
          path: endpoint.path,
        },
      },
      update: {},
      create: {
        ...endpoint,
        status: 'healthy',
      },
    })
  }
  console.log('Created API endpoints for monitoring')

  console.log('Database seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
