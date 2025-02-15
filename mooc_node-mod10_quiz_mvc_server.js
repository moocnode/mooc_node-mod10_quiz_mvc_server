const express = require('express');
const app = express();

// Import MW for parsing POST params in BODY - Necesario cuando usamos POST, para acceder a los parametros que vienen en el body.

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

// Import MW supporting Method Override with express - Los formularios solo pueden ser GET o POST, a pesar de usar uno de esos, queremos sobreescribir el metodo para que sea un PUT, DELETE

var methodOverride = require('method-override');
app.use(methodOverride('_method', { methods: ['POST','GET']})); // <= OJO, el parametro final POST y GET para que se aplique a los dos metodos. Si no se pone, solo se aplica a POST


// MODEL

const Sequelize = require('sequelize');

const options = {logging: false, operatorsAliases: false};
const sequelize = new Sequelize("sqlite:db.sqlite", options);

const quizzes = sequelize.define(  // define table quizzes
    'quizzes',
    {
        question: Sequelize.STRING,
        answer: Sequelize.STRING
    }
);

sequelize.sync() // Syncronize DB and seed if needed
    .then(() => quizzes.count())
    .then((count) => {
        if (count === 0) {
            return (
                quizzes.bulkCreate([
                    {id: 1, question: "Capital of Italy", answer: "Rome"},
                    {id: 2, question: "Capital of France", answer: "Paris"},
                    {id: 3, question: "Capital of Spain", answer: "Madrid"},
                    {id: 4, question: "Capital of Portugal", answer: "Lisbon"}
                ])
                    .then(c => console.log(`  DB created with ${c.length} elems`))
            )
        } else {
            return console.log(`  DB exists & has ${count} elems`);
        }
    })
    .catch(err => console.log(`   ${err}`));


// VIEWs

const index = (quizzes) => `<!-- HTML view -->
<html>
    <head><title>MVC Example</title><meta charset="utf-8"></head> 
    <body> 
        <h1>MVC: Quizzes</h1> 
        <table border="0">`
    + quizzes.reduce(
        (ac, quiz) => ac +=
            `<tr><td><a href="/quizzes/${quiz.id}/play">${quiz.question}</a></td>
        <td><a href="/quizzes/${quiz.id}/edit"><button>Edit</button></a></td>
        <td><a href="/quizzes/${quiz.id}?_method=DELETE" onClick="return confirm('Delete: ${quiz.question}')">  <button>Delete</button></a></td>
        <br>\n </tr>`,
        ""
    )
    + `</table>     <p/>
        <a href="/quizzes/new"><button>New Quiz</button></a>
    </body>
</html>`;

const play = (id, question, response) => `<!-- HTML view -->
<html>
    <head><title>MVC Example</title><meta charset="utf-8">
        <script type="text/javascript" src="https://code.jquery.com/jquery-3.3.1.min.js" > </script>
        <script type="text/javascript">
        $(function()
        {
            $("form").submit(function(){
                
                $.ajax( { type:'GET',
                    url: '/quizzes/'+ $("form").attr("id") +'/check?response=' + $('input[name=response]').val(),
                    success: function(response){
                      $('#msg').html(response);
                    }
                });
            });
        });
        </script>
    </head> 
    <body>
        <h1>MVC: Quizzes</h1>
        <form  id="${id}" method="get" action="javascript:void(0);"> <!-- action="/quizzes/${id}/check"> -->
            ${question}: <p>
            <input type="text" name="response" value="${response}" placeholder="Answer" />
            <input type="submit" value="Check"/> <br>
            </p>
        </form>
        <p>
        <strong><div id="msg"></div></strong>
        </p>
        <a href="/quizzes"><button>Go back</button></a>
    </body>
</html>`;

const quizForm = (msg, method, event, action, question, answer) => `<!-- HTML view -->
<html>
    <head><title>MVC Example</title><meta charset="utf-8"></head> 
    <body>
        <h1>MVC: Quizzes</h1>
        <form   method="${method}"   action="${action}">
            ${msg}: <p>
            <input  type="text"  name="question" value="${question}" placeholder="Question" />
            <input  type="text"  name="answer"   value="${answer}"   placeholder="Answer" />
            <input  type="submit" value="${event}"/> <br>
        </form>
        </p>
        <a href="/quizzes"><button>Go back</button></a>
    </body>
</html>`;


// CONTROLLER

// GET /, GET /quizzes
const indexController = (req, res, next) => {

    quizzes.findAll()
        .then((quizzes) => res.send(index(quizzes)))
        .catch((error) => `DB Error:\n${error}`);
}

//  GET  /quizzes/1/play
const playController = (req, res, next) => {
    let id = Number(req.params.id);
    let response = req.query.response || "";

    quizzes.findById(id)
        .then((quiz) => res.send(play(id, quiz.question, response)))
        .catch((error) => `A DB Error has occurred:\n${error}`);
};

//  GET  /quizzes/1/check
const checkController = (req, res, next) => {
    let response = req.query.response, msg;
    let id = Number(req.params.id);

    quizzes.findById(id)
        .then((quiz) => {
            msg = (quiz.answer === response) ?
                `Yes, "${response}" is the ${quiz.question}`
                : `No, "${response}" is not the ${quiz.question}`;
            //return res.send(check(id, msg, response));
            return res.send(msg);
        })
        .catch((error) => `A DB Error has occurred:\n${error}`);
};

//  GET /quizzes/1/edit
const editController = (req, res, next) => {

    // .... introducir código
    let id = Number(req.params.id);

    quizzes.findById(id)
        .then((quiz) => {
            return res.send(quizForm("Edit Quiz", "post", "Update", `/quizzes/${quiz.id}?_method=PUT`, quiz.question, quiz.answer));
        })
        .catch((error) => `A DB Error has occurred:\n${error}`);
};

//  PUT /quizzes/1
const updateController = (req, res, next) => {

    // .... introducir código

    let id = Number(req.params.id);

    quizzes.findById(id)
        .then((quiz) => {
            quiz.question=req.body.question;
            quiz.answer=req.body.answer;
            return quiz.save();
        })
        .then(() => res.redirect('/quizzes'))
        .catch((error) => `A DB Error has occurred:\n${error}`);

};

// GET /quizzes/new
const newController = (req, res, next) => {

    res.send(quizForm("Create new Quiz", "post", "Create", "/quizzes", "", ""));
};

// POST /quizzes
const createController = (req, res, next) => {
    let {question, answer} = req.body;

    quizzes.build({question, answer})
        .save()
        .then((quiz) => res.redirect('/quizzes'))
        .catch((error) => `Quiz not created:\n${error}`);
};

// DELETE /quizzes/1
const destroyController = (req, res, next) => {

    // .... introducir código
    let id = Number(req.params.id);
    quizzes.destroy({where: {id}})
        .then(() => res.redirect('/quizzes'))
        .catch((error) => `A DB Error has occurred:\n${error}`);
};


// ROUTER

app.get(['/', '/quizzes'], indexController);
app.get('/quizzes/:id/play', playController);
app.get('/quizzes/:id/check', checkController);
app.get('/quizzes/new', newController);
app.post('/quizzes', createController);

// ..... instalar los MWs asociados a
//   GET  /quizzes/:id/edit,   PUT  /quizzes/:id y  DELETE  /quizzes/:id
app.get('/quizzes/:id/edit', editController);
app.put('/quizzes/:id', updateController);
app.delete('/quizzes/:id', destroyController);



app.all('*', (req, res) =>
    res.send("Error: resource not found or method not supported")
);


// Server started at port 8000

app.listen(8000);

