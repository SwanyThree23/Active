import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@swanybot.com' },
    update: {},
    create: {
      email: 'admin@swanybot.com',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      isVerified: true,
    },
  })
  console.log(`✅ Admin user created: ${admin.email}`)

  // Create demo user
  const demoPassword = await bcrypt.hash('Demo1234!', 12)
  const demo = await prisma.user.upsert({
    where: { email: 'demo@swanybot.com' },
    update: {},
    create: {
      email: 'demo@swanybot.com',
      username: 'SwanyStreamer',
      password: demoPassword,
      bio: 'Professional streamer and content creator',
      isVerified: true,
    },
  })
  console.log(`✅ Demo user created: ${demo.email}`)

  // Create sample stream for demo user
  const stream = await prisma.stream.create({
    data: {
      userId: demo.id,
      title: 'Welcome to SwanyBot Pro!',
      description: 'Testing the ultimate streaming automation platform',
      platform: 'TWITCH',
    },
  })
  console.log(`✅ Sample stream created: ${stream.title}`)

  // Create sample chat commands
  const commands = [
    { command: '!hello', response: 'Hello! Welcome to the stream! 👋' },
    { command: '!discord', response: 'Join our Discord: discord.gg/swanybot' },
    { command: '!social', response: 'Follow me on Twitter: @swanystreamer' },
    { command: '!uptime', response: 'Stream has been live for {uptime}!' },
  ]

  for (const cmd of commands) {
    await prisma.chatCommand.upsert({
      where: {
        userId_command: {
          userId: demo.id,
          command: cmd.command,
        },
      },
      update: {},
      create: {
        userId: demo.id,
        command: cmd.command,
        response: cmd.response,
      },
    })
  }
  console.log(`✅ Created ${commands.length} sample chat commands`)

  // Create sample alerts
  const alerts = [
    { name: 'New Follower', type: 'FOLLOWER' as const, config: { sound: true, duration: 5 } },
    { name: 'New Subscriber', type: 'SUBSCRIBER' as const, config: { sound: true, duration: 8 } },
    { name: 'Donation Alert', type: 'DONATION' as const, config: { sound: true, minAmount: 1 } },
  ]

  for (const alert of alerts) {
    await prisma.alert.create({
      data: {
        userId: demo.id,
        name: alert.name,
        type: alert.type,
        config: alert.config,
      },
    })
  }
  console.log(`✅ Created ${alerts.length} sample alerts`)

  // Create sample automation
  await prisma.automation.create({
    data: {
      userId: demo.id,
      name: 'Welcome New Followers',
      description: 'Automatically thank new followers in chat',
      trigger: 'NEW_FOLLOWER',
      action: {
        type: 'SEND_MESSAGE',
        template: 'Welcome to the stream, {username}! Thanks for following! 🎉',
      },
    },
  })
  console.log(`✅ Created sample automation`)

  console.log('')
  console.log('🎉 Database seeding completed!')
  console.log('')
  console.log('📝 Test Accounts:')
  console.log('   Admin: admin@swanybot.com / Admin123!')
  console.log('   Demo:  demo@swanybot.com / Demo1234!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
