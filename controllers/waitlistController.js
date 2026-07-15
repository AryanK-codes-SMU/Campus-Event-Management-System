const Waitlist = require('./../models/Waitlist')
const Event = require('../models/Event')    
const UserInformation = require('../models/UserInfo') 

// // when user presses join wait list button (CREATE)
exports.joinWaitlist = async (req, res) => {
    const eventId = req.body.eventId
    const userId = req.session.userId
    const notes = req.body.notes || ''

    try {
        // gets entire waitlist of event 
        const waitlistEntries = await Waitlist.getEventWaitlist(eventId)
        // update the position of new user 
        const position = waitlistEntries.length + 1

        await Waitlist.addToWaitlist({
            eventId: eventId,
            userId: userId,
            position: position,
            status: 'waiting',
            notes: notes
        })

        res.redirect(`/waitlist?eventId=${eventId}`)

    } catch (error) {
        console.error(error)
        res.send('Error joining waitlist')    
    }
}

// when user/organiser checks waitlist position (READ)
exports.viewWaitlist = async (req, res) => {

    const eventId = req.query.eventId 
    const userId = req.session.userId      

    try {
        const event = await Event.findById(eventId)
        // if user is on the waitlist page but event suddenly gets deleted 
        if (!event) return res.send('Event not found')

        const userWaitlist = await Waitlist.getUserWaitlistEntry(eventId, userId)
        const waitlist = await Waitlist.getEventWaitlist(eventId)
        const isOrganizer = event.createdBy == userId
        const waitlistWithUsers = []
        for (let i = 0; i < waitlist.length; i++) {
            const entry = waitlist[i]
            const user = await UserInformation.getUserById(entry.userId)

            waitlistWithUsers.push({
                _id: entry._id,
                position: entry.position,
                status: entry.status,
                notes: entry.notes,
                userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown'
            })
        }
        res.render('waitlist/waitlist', {
            event: event,
            userWaitlist: userWaitlist,
            waitlist: waitlistWithUsers,
            isOrganizer: isOrganizer,
            error: null
        })

    } catch (error) {
        console.error(error)
        res.send('Error reading database')
    }
}


// when user leaves the waitlist (DELETE)
exports.leaveWaitlist = async (req, res) => {
    const waitlistId = req.body.waitlistId
    const eventId = req.body.eventId
    const userId = req.session.userId

    try {
        const entry = await Waitlist.getUserWaitlistEntry(eventId, userId)
        const removedPosition = entry.position

        await Waitlist.removeFromWaitlist(waitlistId) 

        const remaining = await Waitlist.getEventWaitlist(eventId)
        for (const item of remaining) {
            if (item.position > removedPosition) {
                await Waitlist.updatePosition(item._id.toString(), item.position - 1)
            }
        }

        res.redirect(`/waitlist?eventId=${eventId}`)

    } catch (error) {
        console.error(error)
        res.send('Error leaving waitlist')
    }
}



