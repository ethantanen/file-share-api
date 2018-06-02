const fs = require('fs');
const mongodb = require('mongodb');
const express = require('express')
const formidable = require('formidable')

const app = express()

// Set the view engine in order to render interface
app.set('view engine', 'ejs');

//Middleware?
app.use(express.static(__dirname + '/views'));

// Address of mongodb hosted on mlab.com
const uri = "mongodb://ethantanen:mississippi1@ds245240.mlab.com:45240/file-api";

// GridFSBucket object used for communicating with mongodb
var database

// Connect to mongodb
mongodb.MongoClient.connect(uri, (err, db) => {
  // Check for errors
  if(err) return console.log(err)
  // Make database global
  database = new mongodb.GridFSBucket(db)
  // Begin server

  //Port?

  port = process.env.PORT || 3000

  app.listen(port, () => {
    console.log('\nServer started! --> visit localhost:3000\n')
  })
});


// Display form
app.get('/', (req,res) => {

  var lists = []

  files = database.find({})

  files.on('data', (chunk) => {
    lists.push([chunk.filename,chunk.uploadDate,chunk._id])
  })

  files.on('end', () => {
    res.render('index.ejs',{list:lists})
  })

})


app.post('/download', (req,res) => {
  var form = new formidable.IncomingForm()



  form.parse(req, (err,fields) => {
    console.log(fields)

    var sup = database.openDownloadStream(mongodb.ObjectId(fields.id)).pipe(fs.createWriteStream("./eee.jpg")).
    on('finish', () => {res.redirect('/')})


  })

})



// Download file by name to current directory
app.get('/find/name', (req,res) => {

  file_name = req.query.name
  var file = database.openDownloadStreamByName(file_name).pipe(fs.createWriteStream("./"+file_name))

  res.redirect('/')

})

//



// Upload file
app.post('/upload', (req,res) => {

  var form = new formidable.IncomingForm();

  // Parse form
  form.parse(req, function(err, fields, file) {

    // Check for errors
    if(err || file.file.name == "") return console.log("\nFile does not exists")

    // Saucy print statement
    console.log("\nUploading...","\nPath:",__dirname + file.file.path,"\nName:",file.file.name)


    // Upload file to database
    fs.createReadStream(file.file.path).

    pipe(database.openUploadStream(file.file.name,{"metadata":fields.tags})).

    // Log errors
    on('error', (err)  => {
      if(err) console.log(err)
    }).
    // Log success message
    on('finish', function() {
      console.log(`Success! ${file.file.name} stored in database`);
      res.redirect('/')
    });
  });
})






//TODO: add multiple, delete one/multiple, retrieve one/multiple, update entries tags