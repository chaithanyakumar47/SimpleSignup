const express = require('express');
const app = express();
const bodyParser = require('body-parser');
var cors = require('cors');
app.use(cors());

const sequelize = require('./util/database');
const User = require('./models/User')


app.use(bodyParser.json({ extended: false}));

app.post('/user/signup', async (req, res, next) => {
    try{
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        const data = await User.create( { username: username, email: email, password: password });
        // res.status(201).json({reviewDetail: data});
        res.status(201)
        
        
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
            const passCheck = await User.findAll({ where: { email: email, password: password}});
            if(passCheck.length > 0) {
                res.json({message: 'Logged in'});
            } else{
                res.json({message: 'User not authorized'});
            }
        }else {
            res.json({message: 'User does not exist'})
        }
        
    } 
    catch(err) {
        res.status(404).json({err: err});
    }    
})



sequelize
.sync()
.then(result => {
    app.listen(3000);
}).catch(err => console.log(err));
