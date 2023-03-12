//The server uses the express framework, here are some initial settings
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
const { parseString } = require('xml2js');
const fs = require('fs');
const xml2js = require('xml2js');
const parser = new xml2js.Parser({explicitArray: false});
const builder = new xml2js.Builder();
const xml = fs.readFileSync('db.xml', 'utf8');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

//This setting allows any client to send requests to the server
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

//This route is used to get the addTopic and Text requests
app.post("/store/input/", (req, res, next) => {

    //Get the request sent by the client, and the value of the parameters
    let topicname=req.body.topic;
    let text=req.body.text;
    let time=req.body.time;
    let dis = 0;

//Read the db.xml file
fs.readFile('db.xml', (err, data) => {
    if (err) {
        res.status(400).json( err );;
        return;
    }   
    // Parse the XML into a JavaScript object
    parser.parseString(data, (err, result) => {
        if (err) {
            res.status(400).json(err );
        return;
        }
        // Find the topic with the same name as req.body.topic
        let topics = result.data.topic;
        try{for (const topic of topics) {
            if(topic.$.name === topicname){
                dis = 1;
            }
          }}catch{
            if(topics.$.name === topicname){
                dis = 1;
            }
          }
          
        // Find the topic with the same name as req.body.topic

        if (!Array.isArray(result.data.topic)) {
            // If there is only one topic in the XML, convert it to an array
            result.data.topic = [result.data.topic];
            }
            
            const topicIndex = result.data.topic.findIndex((t) => t.$.name === req.body.topic);
            
            if (dis == 1) {
            // If the topic already exists, add a new note to it
            if (!Array.isArray(result.data.topic[topicIndex].note)) {
                result.data.topic[topicIndex].note = [result.data.topic[topicIndex].note];
            }
            console.log("to.",topicIndex)
            result.data.topic[topicIndex].note.push({
                $: { name: 'New Note' },
                text: [text],
                timestamp: [time],
            });
            } else {
            // If the topic doesn't exist, create a new one with a new note
            result.data.topic.push({
                $: { name: req.body.topic },
                note: [
                {
                    $: { name: 'New Note' },
                    text: [text],
                    timestamp: [time],
                },
                ],
            });
            }

        // Convert the JavaScript object back to XML
        const builder = new xml2js.Builder();
        const xml = builder.buildObject(result);
    
        // Write the modified XML back to the file
        fs.writeFile('db.xml', xml, (err) => {
        if (err) {
            res.status(400).json(err );
            return;
        }
        //Send feedback to client
        console.log('File updated successfully');
        res.status(200).json('File updated successfully');
        });
    });
    });
});


//This route is used to respond to a lookup request sent by the client
app.post("/find/", (req, res, next) => {
    //Get the parameters sent by the client
    let topicname=req.body.topic;
    dis = 0;
    //Open the db.xml file
    fs.readFile('db.xml', (err, data) => {
        if (err) {
            res.status(400).json(err );
            return;
        }
        
        // Parse the XML into a JavaScript object
        parser.parseString(data, (err, result) => {
            if (err) {
                res.status(400).json(err);
            return;
            }
            // Find the topic with the same name as req.body.topic
            let topics = result.data.topic;
            try{for (const topic of topics) {
                if(topic.$.name === topicname){
                    dis =1
                    console.log(topic)
                    res.status(200).json(topic);
                    
                }
              }}catch{
                if(topics.$.name === topicname){
                    dis =1
                    console.log(topics)
                    res.status(200).json(topics);
                }
              }
            //If the corresponding keyword is not found, this value is returned
            if(dis ===0){

                const note ={
                    '$': { name: 'It is a great pity' },
                    note: {
                      '$': { name: 'It is a great pity' },
                      text: 'No keywords found',
                      timestamp: 'No keywords found'
                    }
                  };
                res.status(404).json(note);
            }
             
              
        });
        });

});





//Get the request sent by the client and use the wiki's API to get the corresponding search content
app.post("/find/wiki/", (req, res, next) => {
    let topicname=req.body.topic;
    let time=req.body.time;
    let dis =0;
    console.log(topicname)
    //The following content is from the wiki documentation, the purpose is to send a query request to the wiki and get the returned results
    var url = "https://en.wikipedia.org/w/api.php"; 

    var params = {
        action: "opensearch",
        search: topicname,
        limit: "5",
        namespace: "0",
        format: "json"
    };
    
    url = url + "?origin=*";
    Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});
    //Processing of information returned by the wiki
    fetch(url)
        .then(function(response){return response.json();})
        .then(function(response) {
            console.log(response[3])
            
            if(response[3].length === 0){
                res.status(200).json('Can not find in wiki');
                return next('POST route stopped because Can not find in wiki');
                
            }
            else{
                fs.readFile('db.xml', (err, data) => {
                    if (err) {
                        res.status(400).json(err);
                        return;
                    }
                    
                    // Parse the XML into a JavaScript object
                    parser.parseString(data, (err, result) => {
                        if (err) {
                            res.status(400).json(err);
                        return;
                        }
                    
                        // Find the topic with the same name as req.body.topic
                        let topics = result.data.topic;
                        try{for (const topic of topics) {
                            if(topic.$.name === topicname){
                                dis = 1;
                                console.log(dis,2)
                            }
                          }}catch{
                            if(topics.$.name === topicname){
                                dis = 1;
                                console.log(dis,1)
                            }
                          }
                          
                        // Find the topic with the same name as req.body.topic
                
                        if (!Array.isArray(result.data.topic)) {
                            // If there is only one topic in the XML, convert it to an array
                            result.data.topic = [result.data.topic];
                            }
                            
                            const topicIndex = result.data.topic.findIndex((t) => t.$.name === req.body.topic);
                            
                            if (dis == 1) {
                            // If the topic already exists, add a new note to it
                            if (!Array.isArray(result.data.topic[topicIndex].note)) {
                                result.data.topic[topicIndex].note = [result.data.topic[topicIndex].note];
                            }
                            console.log("to.",topicIndex)
                            result.data.topic[topicIndex].note.push({
                                $: { name: 'New Note' },
                                text: [response[3][0]],
                                timestamp: [time],
                            });
                            } else {
                            // If the topic doesn't exist, create a new one with a new note
                            result.data.topic.push({
                                $: { name: req.body.topic },
                                note: [
                                {
                                    $: { name: 'New Note' },
                                    text: [response[3][0]],
                                    timestamp: [time],
                                },
                                ],
                            });
                            }
                              
                    
                        // Convert the JavaScript object back to XML
                        const builder = new xml2js.Builder();
                        const xml = builder.buildObject(result);
                    
                        // Write the modified XML back to the file
                        fs.writeFile('db.xml', xml, (err) => {
                        if (err) {
                            res.status(400).json(err);
                            return;
                        }
                        
                        console.log('wiki web  updated successfully');
                        res.status(200).json('wiki web updated successfully');
                        });
                    });
                    });
                
            }        
            
            })
        .catch(function(error){console.log(error);});

});


module.exports = app;
