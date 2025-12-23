-- SwanyThree Ultimate Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255),
  api_keys JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  subscription_tier VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Streams management
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  platform VARCHAR(50),
  status VARCHAR(20) DEFAULT 'offline',
  metrics JSONB DEFAULT '{"viewers": 0, "peak_viewers": 0, "chat_messages": 0}',
  obs_config JSONB DEFAULT '{}',
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- N8N Workflows tracking
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  n8n_workflow_id VARCHAR(200),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  config JSONB,
  status VARCHAR(20) DEFAULT 'active',
  executions INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  last_run TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Agents
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50), -- content_creator, moderator, analyst, podcast_producer
  voice_id VARCHAR(100), -- ElevenLabs voice ID
  personality JSONB DEFAULT '{}',
  specialties JSONB DEFAULT '[]',
  avatar_url TEXT,
  gradient_colors JSONB DEFAULT '["#3b82f6", "#8b5cf6"]',
  tasks_completed INT DEFAULT 0,
  tokens_used INT DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Skill executions log
CREATE TABLE skill_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  skill_name VARCHAR(100) NOT NULL,
  input_data JSONB,
  output_data JSONB,
  tokens_used INT DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0,
  duration_ms INT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Media assets (video, audio, podcasts)
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50), -- video, audio, podcast, thumbnail, avatar
  platform VARCHAR(50), -- heygen, synthesia, elevenlabs, suno
  asset_id VARCHAR(200),
  title VARCHAR(500),
  url TEXT,
  thumbnail_url TEXT,
  duration_seconds INT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW()
);

-- VDO.Ninja rooms
CREATE TABLE vdoninja_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  room_id VARCHAR(200) UNIQUE NOT NULL,
  room_name VARCHAR(200),
  host_url TEXT,
  guest_urls JSONB DEFAULT '[]',
  guests JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  platform VARCHAR(50),
  username VARCHAR(100),
  message TEXT NOT NULL,
  badges JSONB DEFAULT '[]',
  is_highlighted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Platform connections
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- twitch, youtube, discord, tiktok, instagram
  platform_user_id VARCHAR(200),
  access_token_encrypted JSONB,
  refresh_token_encrypted JSONB,
  token_expires_at TIMESTAMP,
  is_connected BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Cost tracking
CREATE TABLE cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service VARCHAR(100) NOT NULL, -- claude, elevenlabs, heygen, openai
  category VARCHAR(50), -- voice, video, text, api
  amount_usd DECIMAL(10,4) NOT NULL,
  tokens_used INT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- System status logs
CREATE TABLE system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'operational', -- operational, degraded, outage
  latency_ms INT,
  last_check TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_streams_user_status ON streams(user_id, status);
CREATE INDEX idx_streams_status ON streams(status);
CREATE INDEX idx_workflows_user_status ON workflows(user_id, status);
CREATE INDEX idx_agents_user ON ai_agents(user_id);
CREATE INDEX idx_executions_user_created ON skill_executions(user_id, created_at DESC);
CREATE INDEX idx_executions_skill ON skill_executions(skill_name, created_at DESC);
CREATE INDEX idx_media_user_type ON media_assets(user_id, type);
CREATE INDEX idx_chat_stream ON chat_messages(stream_id, created_at DESC);
CREATE INDEX idx_cost_user_service ON cost_tracking(user_id, service, created_at DESC);
CREATE INDEX idx_platform_connections_user ON platform_connections(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_connections_updated_at BEFORE UPDATE ON platform_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system services for status monitoring
INSERT INTO system_status (service, status) VALUES
  ('API Gateway', 'operational'),
  ('Database', 'operational'),
  ('Redis Cache', 'operational'),
  ('N8N Workflows', 'operational'),
  ('Claude API', 'operational'),
  ('ElevenLabs', 'operational'),
  ('HeyGen', 'operational'),
  ('VDO.Ninja', 'operational'),
  ('OBS WebSocket', 'operational'),
  ('Twitch API', 'operational'),
  ('YouTube API', 'operational'),
  ('Discord Bot', 'operational');
