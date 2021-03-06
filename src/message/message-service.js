const xss = require('xss')

const MessageService = {
  //get messages in conversation 
  getAllMessages(db, conversationId) {
    return db
      .from('message')
      .select('*')
      .where('message.conversation_id',conversationId)
  },

  //get specific messages
  getByID(db, id) {
    return db
      .from('message')
      .select('*')
      .where({id})
      .first()
  },

  //post new message entry upon new message creation
  insertMessage(db, newMessage) {
    return db
      .insert(newMessage)
      .into('message')
      .returning('*')
      .then(([message]) => message)
      .then(message => 
        MessageService.getByID(db, message.id)
      )
  },

  //patch message for saving & patch message for sending - using different fields 
  updateMessage(db, id, newMessageFields) {
    return db('message')
      .where({id})
      .update(newMessageFields)
    // -- returning message after update?
      .returning('*')
      .then(([message]) => message)
      .then(message =>
        MessageService.getByID(db, message.id)
      )
  },

  serializeMessage(message) {
    return {
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      sender_status: message.sender_status,
      receiver_id: message.receiver_id,
      receiver_status: message.receiver_status,
      content: xss(message.content) || 'Message in progress...',
      date_sent: message.date_sent || null,
      is_read: message.is_read,
    }
  },

  setConversationTurns(db, conversation_id, user_1_bool, user_2_bool) {
    return db('conversation')
      .where('id', conversation_id)
      .update({
        user_1_turn: user_1_bool,
        user_2_turn: user_2_bool
      }, ['user_1_turn', 'user_2_turn'])
      
  },

  serializeMessages(messages) {
    return messages.map(this.serializeMessage)
  },

}


module.exports = MessageService