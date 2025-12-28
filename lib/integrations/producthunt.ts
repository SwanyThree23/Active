const PRODUCTHUNT_API_URL = 'https://api.producthunt.com/v2/api/graphql'

interface Product {
  id: string
  name: string
  tagline: string
  description: string
  url: string
  websiteUrl: string
  votesCount: number
  commentsCount: number
  reviewsCount: number
  thumbnail: string
  featuredAt?: string
  ranking?: number
  topics: string[]
}

interface Post {
  id: string
  name: string
  tagline: string
  votesCount: number
  commentsCount: number
  createdAt: string
  featuredAt?: string
  thumbnail: string
  url: string
  makers: Array<{
    id: string
    name: string
    avatar: string
  }>
}

interface User {
  id: string
  name: string
  username: string
  avatar: string
  headline: string
  followersCount: number
  followingCount: number
  productsCount: number
}

export const productHuntClient = {
  getHeaders(): HeadersInit {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PRODUCTHUNT_API_KEY}`,
    }
  },

  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(PRODUCTHUNT_API_URL, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      throw new Error(`Product Hunt API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'GraphQL error')
    }

    return data.data
  },

  // Products/Posts
  async getProduct(slug: string): Promise<Product> {
    const query = `
      query GetProduct($slug: String!) {
        post(slug: $slug) {
          id
          name
          tagline
          description
          url
          website
          votesCount
          commentsCount
          reviewsCount
          thumbnail {
            url
          }
          featuredAt
          topics {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `

    const data = await this.query<{ post: {
      id: string
      name: string
      tagline: string
      description: string
      url: string
      website: string
      votesCount: number
      commentsCount: number
      reviewsCount: number
      thumbnail: { url: string }
      featuredAt?: string
      topics: { edges: Array<{ node: { name: string } }> }
    } }>(query, { slug })

    return {
      id: data.post.id,
      name: data.post.name,
      tagline: data.post.tagline,
      description: data.post.description,
      url: data.post.url,
      websiteUrl: data.post.website,
      votesCount: data.post.votesCount,
      commentsCount: data.post.commentsCount,
      reviewsCount: data.post.reviewsCount,
      thumbnail: data.post.thumbnail.url,
      featuredAt: data.post.featuredAt,
      topics: data.post.topics.edges.map((e) => e.node.name),
    }
  },

  async getTodaysPosts(first = 20): Promise<Post[]> {
    const query = `
      query GetTodaysPosts($first: Int!) {
        posts(first: $first) {
          edges {
            node {
              id
              name
              tagline
              votesCount
              commentsCount
              createdAt
              featuredAt
              thumbnail {
                url
              }
              url
              makers {
                id
                name
                profileImage
              }
            }
          }
        }
      }
    `

    const data = await this.query<{ posts: { edges: Array<{ node: {
      id: string
      name: string
      tagline: string
      votesCount: number
      commentsCount: number
      createdAt: string
      featuredAt?: string
      thumbnail: { url: string }
      url: string
      makers: Array<{ id: string; name: string; profileImage: string }>
    } }> } }>(query, { first })

    return data.posts.edges.map((edge) => ({
      id: edge.node.id,
      name: edge.node.name,
      tagline: edge.node.tagline,
      votesCount: edge.node.votesCount,
      commentsCount: edge.node.commentsCount,
      createdAt: edge.node.createdAt,
      featuredAt: edge.node.featuredAt,
      thumbnail: edge.node.thumbnail.url,
      url: edge.node.url,
      makers: edge.node.makers.map((m) => ({
        id: m.id,
        name: m.name,
        avatar: m.profileImage,
      })),
    }))
  },

  async getPostsByDate(date: string, first = 20): Promise<Post[]> {
    const query = `
      query GetPostsByDate($postedAfter: DateTime!, $postedBefore: DateTime!, $first: Int!) {
        posts(postedAfter: $postedAfter, postedBefore: $postedBefore, first: $first, order: VOTES) {
          edges {
            node {
              id
              name
              tagline
              votesCount
              commentsCount
              createdAt
              featuredAt
              thumbnail {
                url
              }
              url
            }
          }
        }
      }
    `

    const postedAfter = new Date(date)
    postedAfter.setHours(0, 0, 0, 0)
    const postedBefore = new Date(date)
    postedBefore.setHours(23, 59, 59, 999)

    const data = await this.query<{ posts: { edges: Array<{ node: {
      id: string
      name: string
      tagline: string
      votesCount: number
      commentsCount: number
      createdAt: string
      featuredAt?: string
      thumbnail: { url: string }
      url: string
    } }> } }>(query, {
      postedAfter: postedAfter.toISOString(),
      postedBefore: postedBefore.toISOString(),
      first,
    })

    return data.posts.edges.map((edge, index) => ({
      id: edge.node.id,
      name: edge.node.name,
      tagline: edge.node.tagline,
      votesCount: edge.node.votesCount,
      commentsCount: edge.node.commentsCount,
      createdAt: edge.node.createdAt,
      featuredAt: edge.node.featuredAt,
      thumbnail: edge.node.thumbnail.url,
      url: edge.node.url,
      makers: [],
      ranking: index + 1,
    }))
  },

  // Topics
  async getTopics(first = 50): Promise<Array<{
    id: string
    name: string
    slug: string
    postsCount: number
  }>> {
    const query = `
      query GetTopics($first: Int!) {
        topics(first: $first) {
          edges {
            node {
              id
              name
              slug
              postsCount
            }
          }
        }
      }
    `

    const data = await this.query<{ topics: { edges: Array<{ node: {
      id: string
      name: string
      slug: string
      postsCount: number
    } }> } }>(query, { first })

    return data.topics.edges.map((edge) => edge.node)
  },

  // Users
  async getUser(username: string): Promise<User> {
    const query = `
      query GetUser($username: String!) {
        user(username: $username) {
          id
          name
          username
          profileImage
          headline
          followersCount
          followingCount
          madePosts {
            totalCount
          }
        }
      }
    `

    const data = await this.query<{ user: {
      id: string
      name: string
      username: string
      profileImage: string
      headline: string
      followersCount: number
      followingCount: number
      madePosts: { totalCount: number }
    } }>(query, { username })

    return {
      id: data.user.id,
      name: data.user.name,
      username: data.user.username,
      avatar: data.user.profileImage,
      headline: data.user.headline,
      followersCount: data.user.followersCount,
      followingCount: data.user.followingCount,
      productsCount: data.user.madePosts.totalCount,
    }
  },

  // Launch Tracking
  async trackLaunch(slug: string): Promise<{
    product: Product
    hourlyStats: Array<{
      hour: number
      votes: number
      comments: number
    }>
    ranking: number
    competitorComparison: Array<{
      name: string
      votes: number
      difference: number
    }>
  }> {
    // Get product info
    const product = await this.getProduct(slug)

    // Get today's posts for ranking and comparison
    const todaysPosts = await this.getTodaysPosts(50)
    const productIndex = todaysPosts.findIndex((p) => p.id === product.id)
    const ranking = productIndex >= 0 ? productIndex + 1 : 0

    // Competitor comparison (top 5)
    const competitorComparison = todaysPosts.slice(0, 5).map((p) => ({
      name: p.name,
      votes: p.votesCount,
      difference: product.votesCount - p.votesCount,
    }))

    // Simulated hourly stats (in real implementation, this would track over time)
    const currentHour = new Date().getHours()
    const hourlyStats = Array.from({ length: currentHour + 1 }, (_, i) => ({
      hour: i,
      votes: Math.floor((product.votesCount / (currentHour + 1)) * (i + 1)),
      comments: Math.floor((product.commentsCount / (currentHour + 1)) * (i + 1)),
    }))

    return {
      product,
      hourlyStats,
      ranking,
      competitorComparison,
    }
  },

  // Launch Checklist
  getLaunchChecklist(): Array<{
    id: string
    title: string
    description: string
    phase: 'pre-launch' | 'launch-day' | 'post-launch'
    priority: 'high' | 'medium' | 'low'
  }> {
    return [
      {
        id: '1',
        title: 'Prepare Product Assets',
        description: 'Create compelling thumbnail, gallery images, and demo video',
        phase: 'pre-launch',
        priority: 'high',
      },
      {
        id: '2',
        title: 'Write Compelling Copy',
        description: 'Craft tagline, description, and first comment',
        phase: 'pre-launch',
        priority: 'high',
      },
      {
        id: '3',
        title: 'Build Hunter Network',
        description: 'Connect with hunters and schedule launch',
        phase: 'pre-launch',
        priority: 'high',
      },
      {
        id: '4',
        title: 'Notify Community',
        description: 'Alert supporters via email, social, and communities',
        phase: 'pre-launch',
        priority: 'medium',
      },
      {
        id: '5',
        title: 'Schedule Social Posts',
        description: 'Prepare Twitter/X, LinkedIn, and other social announcements',
        phase: 'pre-launch',
        priority: 'medium',
      },
      {
        id: '6',
        title: 'Monitor Launch',
        description: 'Track votes, ranking, and engagement in real-time',
        phase: 'launch-day',
        priority: 'high',
      },
      {
        id: '7',
        title: 'Respond to Comments',
        description: 'Engage with every comment within 30 minutes',
        phase: 'launch-day',
        priority: 'high',
      },
      {
        id: '8',
        title: 'Share Updates',
        description: 'Post hourly updates on social channels',
        phase: 'launch-day',
        priority: 'medium',
      },
      {
        id: '9',
        title: 'Thank Supporters',
        description: 'Send personalized thanks to top supporters',
        phase: 'post-launch',
        priority: 'high',
      },
      {
        id: '10',
        title: 'Analyze Results',
        description: 'Review metrics, feedback, and lessons learned',
        phase: 'post-launch',
        priority: 'medium',
      },
    ]
  },
}

export default productHuntClient
