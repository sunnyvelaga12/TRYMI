const express = require('express');
const router = express.Router();
const chatbotService = require('../services/chatbotService');

// POST /api/chatbot/recommend
router.post('/recommend', async (req, res) => {
  try {
    const { userId, message, userProfile } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await chatbotService.getOutfitRecommendation(
      userId || 'guest',
      message,
      userProfile
    );

    res.json(result);

  } catch (error) {
    console.error('Recommendation Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chatbot/chat
router.post('/chat', async (req, res) => {
  try {
    const { userId, message, userProfile } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await chatbotService.chat(
      userId || 'guest',
      message,
      userProfile
    );

    res.json(result);

  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/chatbot/history/:userId
router.delete('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    chatbotService.clearHistory(userId);
    res.json({ success: true, message: 'History cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

module.exports = router;
