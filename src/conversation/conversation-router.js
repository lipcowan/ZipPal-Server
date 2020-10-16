const express = require('express')
const path = require('path')
const ConversationService = require('./conversation-service.js')
const { requireAuth } = require('../middleware/jwt-auth')


const conversationRouter = express.Router()
const jsonBodyParser = express.json()

// Get all conversations
conversationRouter
  .route('/')
  .all(requireAuth)
  .get(async (req, res, next) => {
    try {
      const conversations = await ConversationService.getUsersConversations(
        req.app.get('db'),
        req.user.id
      )

      const messages = await Promise.all(conversations.map(convo => 
        ConversationService.getConversationMessages(
          req.app.get('db'),
          convo.id
        ))
      )  
      
      res.json({ conversations, messages })
      next()

    } catch(error) {
      next(error)
    }
  })  // Post - start a new conversation between two users
  .post(jsonBodyParser, async (req, res, next) => {
    try {
      const {user_2} = req.body;
      
      if(!user_2) {
        return res.status(400).json({
          error: 'Please provide user_2 id'
        })
      }
      const newConversation = {user_1: req.user.id, user_2}
      const conversation = await ConversationService.beginNewConversation(req.app.get('db'), newConversation);
    
      // if no users are available for conversation then return 404

      await ConversationService.incrementConversationCounts(
        req.app.get('db'), 
        req.user.id,
        user_2
      )

      res.status(201).json(conversation)

      next()
      
    } catch (error) {
      next(error)
    }
  })

// find a random person available
// then start new conversation (or not)

conversationRouter
  .route('/find/:currentConversationIds')
  .all(requireAuth)
// get available users
  .get(jsonBodyParser, async (req, res, next) => {
    const { currentConversationIds } = req.params
    try {
      const conversationIds = currentConversationIds.split('%20')
      console.log(currentConversationIds)
      const availableUsers = await ConversationService.getAvailableUsers(req.app.get('db'))
      const filteredUsers = availableUsers.filter((u) => {
      return (conversationIds.includes(u.id) || u.id === req.user.id) ? null : u
      })

      // if every user has 5 conversations already
      if(filteredUsers.length === 0) {
        res.status(200).json({error: 'no available users'})
      }

      const randomUser = filteredUsers[Math.floor(Math.random() * filteredUsers.length)]

      res.status(200).json(randomUser)

      next()

    } catch (error) {
      next(error)
    }
  })

// accept conversation and then do post
// or look for another person to pair with

// single conversation
conversationRouter
  .route('/:conversation_id')
  .all(requireAuth)
  .patch( async (req, res, next) => {
    try {
      let {conversation_id} = req.params
      conversation_id = parseInt(conversation_id)

      const [pairedUsers] = await ConversationService.deactivateConversation(
        req.app.get('db'),
        conversation_id
      )

      await ConversationService.decrementConversationCounts(
        req.app.get('db'),
        pairedUsers.user_1,
        pairedUsers.user_2
      )
  
      res.status(204).end()
      
    } catch (error) {
      next(error)
    }
  
  })
  
// todo establish endpoint for ending a conversation
 


module.exports = conversationRouter;