const mongoose = require('mongoose');
require('dotenv').config();

// Badge schema (simplified for seeding)
const BadgeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  category: { type: String, required: true },
  requirement: {
    activityType: { type: String, required: true },
    count: { type: Number, required: true },
    timeframe: { type: String }
  },
  pointsReward: { type: Number, default: 10 },
  unlocksFeatures: { type: [String], default: [] },
  isHidden: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Badge = mongoose.model('Badge', BadgeSchema);

const badges = [
  // Policy Creation Badges
  {
    id: 'policy_creator_5',
    name: '📝 Policy Creator',
    description: 'Created 5 policies',
    icon: '📝',
    category: 'milestone',
    requirement: { activityType: 'policy_created', count: 5 },
    pointsReward: 25,
    unlocksFeatures: []
  },
  {
    id: 'policy_creator_10',
    name: '📚 Policy Master',
    description: 'Created 10 policies',
    icon: '📚',
    category: 'milestone',
    requirement: { activityType: 'policy_created', count: 10 },
    pointsReward: 50,
    unlocksFeatures: ['bulk_operations']
  },
  {
    id: 'policy_creator_25',
    name: '📖 Policy Expert',
    description: 'Created 25 policies',
    icon: '📖',
    category: 'milestone',
    requirement: { activityType: 'policy_created', count: 25 },
    pointsReward: 100,
    unlocksFeatures: []
  },

  // Policy Publishing Badges
  {
    id: 'policy_publisher_3',
    name: '🚀 Policy Publisher',
    description: 'Published 3 policies',
    icon: '🚀',
    category: 'milestone',
    requirement: { activityType: 'policy_published', count: 3 },
    pointsReward: 30,
    unlocksFeatures: []
  },
  {
    id: 'policy_publisher_10',
    name: '🌟 Publishing Pro',
    description: 'Published 10 policies',
    icon: '🌟',
    category: 'milestone',
    requirement: { activityType: 'policy_published', count: 10 },
    pointsReward: 75,
    unlocksFeatures: []
  },

  // AI Interaction Badges
  {
    id: 'ai_explorer_10',
    name: '🤖 AI Explorer',
    description: 'Used AI Assistant 10 times',
    icon: '🤖',
    category: 'milestone',
    requirement: { activityType: 'ai_interaction', count: 10 },
    pointsReward: 40,
    unlocksFeatures: []
  },
  {
    id: 'ai_explorer_25',
    name: '🧠 AI Master',
    description: 'Used AI Assistant 25 times',
    icon: '🧠',
    category: 'milestone',
    requirement: { activityType: 'ai_interaction', count: 25 },
    pointsReward: 80,
    unlocksFeatures: ['advanced_ai_insights']
  },
  {
    id: 'ai_explorer_50',
    name: '🎯 AI Expert',
    description: 'Used AI Assistant 50 times',
    icon: '🎯',
    category: 'milestone',
    requirement: { activityType: 'ai_interaction', count: 50 },
    pointsReward: 150,
    unlocksFeatures: []
  },

  // Compliance Check Badges
  {
    id: 'compliance_pro_5',
    name: '🔐 Compliance Pro',
    description: 'Ran 5 compliance checks',
    icon: '🔐',
    category: 'milestone',
    requirement: { activityType: 'compliance_check', count: 5 },
    pointsReward: 35,
    unlocksFeatures: ['advanced_ai_insights']
  },
  {
    id: 'compliance_pro_15',
    name: '🛡️ Compliance Guardian',
    description: 'Ran 15 compliance checks',
    icon: '🛡️',
    category: 'milestone',
    requirement: { activityType: 'compliance_check', count: 15 },
    pointsReward: 70,
    unlocksFeatures: []
  },

  // Policy Comparison Badges
  {
    id: 'policy_analyst_3',
    name: '📊 Policy Analyst',
    description: 'Used "Compare Policies" 3 times',
    icon: '📊',
    category: 'milestone',
    requirement: { activityType: 'policy_comparison', count: 3 },
    pointsReward: 25,
    unlocksFeatures: []
  },
  {
    id: 'policy_analyst_10',
    name: '📈 Comparison Expert',
    description: 'Used "Compare Policies" 10 times',
    icon: '📈',
    category: 'milestone',
    requirement: { activityType: 'policy_comparison', count: 10 },
    pointsReward: 60,
    unlocksFeatures: []
  },

  // DLP Scan Badges
  {
    id: 'dlp_scanner_5',
    name: '🔍 DLP Scanner',
    description: 'Ran 5 DLP scans',
    icon: '🔍',
    category: 'milestone',
    requirement: { activityType: 'dlp_scan', count: 5 },
    pointsReward: 30,
    unlocksFeatures: []
  },
  {
    id: 'dlp_scanner_15',
    name: '🛡️ Security Expert',
    description: 'Ran 15 DLP scans',
    icon: '🛡️',
    category: 'milestone',
    requirement: { activityType: 'dlp_scan', count: 15 },
    pointsReward: 65,
    unlocksFeatures: []
  },

  // Privacy Assessment Badges
  {
    id: 'privacy_assessor_3',
    name: '🔒 Privacy Assessor',
    description: 'Ran 3 privacy assessments',
    icon: '🔒',
    category: 'milestone',
    requirement: { activityType: 'privacy_assessment', count: 3 },
    pointsReward: 35,
    unlocksFeatures: []
  },
  {
    id: 'privacy_assessor_10',
    name: '🔐 Privacy Champion',
    description: 'Ran 10 privacy assessments',
    icon: '🔐',
    category: 'milestone',
    requirement: { activityType: 'privacy_assessment', count: 10 },
    pointsReward: 75,
    unlocksFeatures: []
  },

  // Streak Badges
  {
    id: 'streak_3',
    name: '🔥 3-Day Streak',
    description: 'Active for 3 consecutive days',
    icon: '🔥',
    category: 'streak',
    requirement: { activityType: 'daily_activity', count: 3, timeframe: 'daily' },
    pointsReward: 20,
    unlocksFeatures: []
  },
  {
    id: 'streak_7',
    name: '⚡ 7-Day Streak',
    description: 'Active for 7 consecutive days',
    icon: '⚡',
    category: 'streak',
    requirement: { activityType: 'daily_activity', count: 7, timeframe: 'daily' },
    pointsReward: 50,
    unlocksFeatures: []
  },
  {
    id: 'streak_30',
    name: '💎 30-Day Streak',
    description: 'Active for 30 consecutive days',
    icon: '💎',
    category: 'streak',
    requirement: { activityType: 'daily_activity', count: 30, timeframe: 'daily' },
    pointsReward: 200,
    unlocksFeatures: []
  },

  // Special Badges
  {
    id: 'first_policy',
    name: '🎉 First Policy',
    description: 'Created your first policy',
    icon: '🎉',
    category: 'special',
    requirement: { activityType: 'policy_created', count: 1 },
    pointsReward: 15,
    unlocksFeatures: []
  },
  {
    id: 'first_publish',
    name: '🚀 First Publish',
    description: 'Published your first policy',
    icon: '🚀',
    category: 'special',
    requirement: { activityType: 'policy_published', count: 1 },
    pointsReward: 20,
    unlocksFeatures: []
  },
  {
    id: 'level_5',
    name: '⭐ Level 5',
    description: 'Reached level 5',
    icon: '⭐',
    category: 'special',
    requirement: { activityType: 'level_reached', count: 5 },
    pointsReward: 100,
    unlocksFeatures: []
  },
  {
    id: 'level_10',
    name: '🏆 Level 10',
    description: 'Reached level 10',
    icon: '🏆',
    category: 'special',
    requirement: { activityType: 'level_reached', count: 10 },
    pointsReward: 250,
    unlocksFeatures: []
  }
];

async function seedBadges() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/policy-project');
    console.log('Connected to MongoDB');

    // Clear existing badges
    await Badge.deleteMany({});
    console.log('Cleared existing badges');

    // Insert new badges
    await Badge.insertMany(badges);
    console.log(`Seeded ${badges.length} badges successfully`);

    // Display seeded badges
    const seededBadges = await Badge.find({});
    console.log('\nSeeded badges:');
    seededBadges.forEach(badge => {
      console.log(`- ${badge.icon} ${badge.name}: ${badge.description}`);
    });

  } catch (error) {
    console.error('Error seeding badges:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedBadges();
