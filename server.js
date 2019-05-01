const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex');

const bcrypt =  require('bcrypt');
const saltRounds = 10;
//const someOtherPlaintextPassword = 'not_bacon';

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : '',
    password : '',
    database : 'smart-brain'
  }
});

// db.select('*').from('users').then(data => {
//   console.log(data)
// })

const app = express();
app.use(bodyParser.json());
app.use(cors());


app.get('/', (req,res)=>{
  res.json(db.users)
})

app.post('/signin', (req,res)=>{

  db.select('email', 'hash').from('login')
  .where('email', '=', req.body.email)
  .then(data => {
    const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
    if (isValid) {
      return db.select('*').from('users')
      .where('email', '=', req.body.email)
      .then(user => {
        res.json(user[0])
      })
      .catch(err => res.status(400).json('unable to get user'))
    } else {
      res.status(400).json('wrong credentials')
    }
  })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req,res)=>{
  const {email,name,password} = req.body
  const hash = bcrypt.hashSync(password, saltRounds);
  db.transaction(trx => {
    trx.insert({
      hash: hash,
      email: email
    })
    .into('login')
    .returning('email')
    .then(loginEmail => {
      return trx('users')
      .returning('*')
      .insert({
        email:loginEmail[0],
        name:name,
        joined: new Date()
      })
      .then(user => {
        res.json(user[0]);
      })
    })
    .then(trx.commit)
    .catch(trx.rollback)
  })
  .catch(err => res.status(400).json(err))
})

app.get('/profile/:id',(req,res) => {
  const {id} = req.params;
  //let found = false;
  // database.users.map(user => {
  //   if (id === user.id) return res.json(user)
  // })
  db.select('*').from('users').where({id:id})
  .then(user => {
    if (user.length){
    res.json(user[0]);
  } else {
    res.status(400).json('not found')
  }
  })
})

app.put('/image',(req,res)=>{
  const{id} = req.body;
  db('users').where('id', '=', id)
  .increment('entries', 1)
  .returning('entries')
  .then(entries => {
    res.json(entries)
  })
  .catch(err => res.status(400).json('unable to get entries'))
})

const port = process.env.PORT || 3001

app.listen(port, (req, res) => {
  console.log(`App is running on port ${port}`)
});
