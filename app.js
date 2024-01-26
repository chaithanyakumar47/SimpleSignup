const express = require('express');
const app = express();
const bodyParser = require('body-parser');
var cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwtDecode = require('jwt-decode');
const Razorpay = require('razorpay');
const Sib = require('sib-api-v3-sdk')
const client = Sib.ApiClient.instance
const apiKey = client.authentications['api-key']
apiKey.apiKey = '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'
const { v4: uuidv4 } = require('uuid');

app.use(cors());

const sequelize = require('./util/database');
const User = require('./models/User')
const ForgotPassword = require('./models/ForgotPasswordRequests')
const Expense = require('./models/Expenses');
const Order = require('./models/orders');
const userAuthentication = require('./middleware/auth')
const statusCheck = require('./middleware/statusCheck');
require('dotenv').config()

const rootDir = require('../User Signup/util/path');
const path = require('path');



app.use(bodyParser.json({ extended: false}));

function generateAccessToken(id, name, premiumRequest) {
    if (!premiumRequest){
        return jwt.sign({ userId: id, name: name }, 'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTcwNTEzOTk0OSwiaWF0IjoxNzA1MTM5OTQ5fQ.u17qfbQbdIbKM0Cw4yx_qqxu_SyYWNaFsN5ia1tsOdc')
    } else {
        return jwt.sign({ userId: id, name: name, premiumUser: true }, 'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTcwNTEzOTk0OSwiaWF0IjoxNzA1MTM5OTQ5fQ.u17qfbQbdIbKM0Cw4yx_qqxu_SyYWNaFsN5ia1tsOdc')
    }
    
    
}


app.post('/user/signup', async (req, res, next) => {
    try{
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        bcrypt.hash(password, 10, async(err, hash) => {
            console.log(err);
            const data = await User.create( { username: username, email: email, password: hash, isPremium: false, totalExpenses: 0 });
            res.status(201).json(data);
        })

        
        
    } catch(err) {
        res.status(403).json({ err: err});
    }
});

app.post('/user/login', async (req, res, next) => {
    try{
        const email = req.body.email;
        const password = req.body.password;
        const emailCheck = await User.findAll({ where : {email: email}});
        if (emailCheck.length > 0){
            bcrypt.compare(password, emailCheck[0].password, (err, result) => {
                if(err) {
                    throw new Error('Something went wrong')
                }
                if(result === true) {
                    res.status(200).json({ status: true, message: 'Logged in Successfully', token: generateAccessToken(emailCheck[0].id, emailCheck[0].username, false)});
                }
                else {
                    return res.status(400).json({ status: false, message: 'Password is incorrect'})
                }
            })
        }else {
            res.status(404).json({ status: false, message: 'User does not exist'})
        }
        
    } 
    catch(err) {
        res.status(404).json({err: err});
    }    
})

app.post('/expense/addExpense', userAuthentication.authenticate, async (req, res) => {
    const t = await sequelize.transaction();
    try{
        const date = req.body.date;
        const description = req.body.description;
        const amount = req.body.amount;
        const category = req.body.category
        const income = req.body.income
        const userId = req.user.id
        const currentIncome = req.user.totalIncome;
        const updatedIncome = currentIncome + parseInt(income)
        const currentExpense = req.user.totalExpenses
        const updatedExpense = currentExpense + parseInt(amount)
        if (description){
            const details = await Expense.create({ date: date, description: description, amount: amount, category: category, income: income, userId: userId}, { transaction: t});
            const test = await req.user.update({ totalExpenses: updatedExpense}, { transaction: t })
            await t.commit();
            res.status(201).json(details)
        } else {
            const details = await Expense.create({ date: date, description: null, amount: 0, category: null, income: income, userId: userId}, { transaction: t});
            const test = await req.user.update({ totalIncome: updatedIncome}, { transaction: t })
            await t.commit();
            res.status(201).json(details)
        }
        
        

    } catch (err) {
        await t.rollback();
        res.json(err);
    }
})

app.get('/expense/getExpense', userAuthentication.authenticate, async (req, res) => {
    try {
        // const data = await Expense.findAll({ where: { userId: req.user.id}});
        const data = await req.user.getExpenses();
        res.status(200).json(data);
    } catch(err) {
        res.json(err);
        console.log(err)
    }
})

app.delete('/expense/deleteExpense/:id', userAuthentication.authenticate, async (req, res) => {
    const t = await sequelize.transaction()
    try {
        const userId = req.user.id
        const id = req.params.id;
        const expenseObj = await Expense.findOne({ where: { id: id, userId: userId}})
        const expenseAmount = Number(expenseObj.amount)
        console.log('Expense Amount >>>',expenseAmount)
        const currentAmount = Number(req.user.totalExpenses)
        console.log('Currrent Amount >>>',currentAmount)
        const updatedExpense = currentAmount - expenseAmount
        console.log('Updated Amount >>>',updatedExpense)
        await expenseObj.destroy({transaction: t})
        await req.user.update({totalExpenses: updatedExpense }, { transaction: t})
        
        await t.commit()
        
        res.status(200).json({ message: 'Expense Deleted'});
    } catch (err) {
        await t.rollback()
        res.status(500).json(err);
    }
})


app.get('/purchase/premiumMembership',userAuthentication.authenticate,  async (req, res) => {
    try {
        var rzp = new Razorpay({
            key_id: 'rzp_test_GGMFjCJ9lPLw6J',
            key_secret: 'cia9jlojQRy17AaRzpW4Wts6'
        })
        const amount = 2500;

        rzp.orders.create({amount, currency: "INR"}, (err, order) => {
            if(err) {
                throw new Error(JSON.stringify(err));
            }
            req.user.createOrder({ orderid: order.id, status: 'PENDING'}).then(() => {
                return res.status(201).json({ order, key_id : rzp.key_id});

            }).catch(err => {
                throw new Error(err)
            })
        })
    } catch(err){
        console.log(err);
        res.status(403).json({ message: 'Something went wrong', error: err})
    }
})

app.post('/purchase/updatetransactionstatus', userAuthentication.authenticate, async(req, res) => {
    try {
        const { payment_id, order_id} = req.body;
        const order = await Order.findOne({ where : { orderid: order_id}})
        const promise1 = order.update({ paymentid: payment_id, status: 'SUCCESSFUL'})
        const promise2 = req.user.update({ isPremium: true})
        Promise.all([promise1, promise2]).then(() => {
            return res.status(201).json({ success: true, message: "Transaction Successful"});
        }).catch((err) => {
                    throw new Error(err)
                })
            } catch (err) {
                console.log(err);
                res.status(403).json({ error: err, message: 'Something went wrong'})
            }
        }
);

app.post('/purchase/failedTransaction', userAuthentication.authenticate, async(req, res) => {
    try {
        const { payment_id, order_id } = req.body;
        const order = await Order.findOne({ where: { orderid: order_id }})
        const promise1 = order.update({ paymentid: payment_id, status: 'FAILED'})
        const promise2 = req.user.update({ isPremium: false})
        Promise.all([promise1, promise2]).then(() => {
            return res.status(200).json({ success: false, message: "Transaction Failed"})
        })
    } catch (err) {
        console.log(err);
         
    }
})

app.get('/setPremium', userAuthentication.authenticate, async(req, res) => {
    try {
        const userId = req.userId;
        const name = req.name;
        const token = generateAccessToken(userId, name, true);
        res.status(201).json({ token: token});
    } catch (err) {
        console.log(err)
    }
})

app.get('/checkPremium', statusCheck.authenticate, async(req, res) => {
    try {
        if (req.status === true) {
            res.status(200).json({ success: true})
        } else {
            res.status(200).json({ success: false})
        }
    } catch (err) {
        console.log(err);
    }
})

app.get('/premium/showLeaderboard', userAuthentication.authenticate, async (req, res) =>{
    try {
        const leaderboardofusers = await User.findAll({

            order: [['totalExpenses', 'DESC']]
        })
        res.status(200).json(leaderboardofusers)
    } catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

app.post('/password/forgotpassword',userAuthentication.authenticate, async(req, res) => {
    const uuid =  uuidv4()
    try {
        
        console.log('Inside the Backend API USER ID >>>',req.user.id)
        const details = await ForgotPassword.create({ id: uuid, isactive: true, userId: req.user.id})
        const tranEmailApi = new Sib.TransactionalEmailsApi()
        const sender = {
            email: 'kumarchaithanya.1@gmail.com'
        }
        const receivers = [
            {
                email: req.body.email
            },
        ]
        const data = await tranEmailApi.sendTransacEmail({
            sender,
            to: receivers,
            Subject: 'Link to Reset your Password',
            textContent: `http://localhost:3000/password/resetpassword/${uuid}`
        })
        res.status(200).json({ success: true})

    } catch (err) {
        res.status(500).json(err)
    }
})

app.get('/password/resetpassword/:uuid', async(req, res) => {
    try {
        const uuid = req.params.uuid;
        const data = await ForgotPassword.findOne({ where: { id: uuid}})
        
        if (data.isactive === true) {
            // res.sendFile(path.join(rootDir, 'views','Recovery.html'))
            console.log('WORKS')
            res.send(`<html><script>
            function formsubmitted(e){
                e.preventDefault();
                console.log('called')
            }
        </script><form action="/password/updatepassword/${uuid}"><label for="newpassword">Enter New Password</label><input type="password" name="newpassword" required></input><button>Reset Password</button></form></html>`)
            res.end()
            
        } else {
            res.send('<h1>Please generate a new Link<h1>')
            res.end()
        }
    } catch (err) {
        res.status(500).json(err)
    }
})

app.get('/password/updatepassword/:id', async (req, res) => {
    try {
    
    const newPassword = req.query.newpassword;
    const id = req.params.id;
    bcrypt.hash(newPassword, 10, async(err, hash) => {
        console.log(err);
        const forgotPass = await ForgotPassword.findOne({ where:{id: id }});
        await forgotPass.update({ isactive: false})
        await User.update( { password: hash},{ where: { id: forgotPass.userId}} );
        
        res.status(201).json({success: true});
    })
    } catch (err) {
        res.status(500).json(err)
    }


})

User.hasMany(Expense);
Expense.belongsTo(User);

User.hasMany(Order);
Order.belongsTo(User);

User.hasMany(ForgotPassword)



sequelize
.sync()
.then(result => {
    app.listen(3000);
}).catch(err => console.log(err));

