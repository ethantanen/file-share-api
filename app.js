const fs = require('fs');
const mongodb = require('mongodb');
const express = require('express')
const formidable = require('formidable')
const app = express()

// Set the view engine in order to render UI
app.set('view engine', 'ejs');

// Declare location of static files
app.use(express.static('/views'));

// Address of mongodb hosted on mlab.com

console.log(process.env.USER_MLAB)

const uri = "mongodb://" + process.env.USER_MLAB + ":" + process.env.PASSWORD_MLAB + "@ds245240.mlab.com:45240/file-api";

// GridFSBucket object used for communicating with mongodb
var database

// Connect to mongodb
mongodb.MongoClient.connect(uri, (err, db) => {
  // Check for errors
  if (err) return console.log(err)
  // Make database global
  database = new mongodb.GridFSBucket(db)
  // Begin Server using appropriate port
  var PORT = process.env.PORT || 3000
  app.listen(PORT, () => {
    console.log('\nServer started! --> visit localhost:' + PORT + "\n")
  })
});

// Display home page
app.all('/', (req, res) => {

  var files_meta = [] // list to store information about each queried file
  var form = new formidable.IncomingForm() // used to process form
  var files // cursor object returned by find function

  //parse the form
  form.parse(req, (err, fields) => {

    //if the user wants to filter by tags process the tags
    if (fields.tags) {

      //split up comma dilineated tags and search database accordingly
      var tags = fields.tags.split(',')
      files = database.find({
        "metadata": {$in: tags}
      })

    } else {
      files = database.find({})
    }

    // push each files information into the files_meta list
    files.on('data', (chunk) => {
      files_meta.push([chunk.filename, chunk.uploadDate, chunk._id, chunk.metadata])
    })

    //render the page after processing files in the database
    files.on('end', () => {
      res.render('index.ejs', {
        list: files_meta
      })
    })
  })
})

// Download file by id
app.post('/download/id', (req, res) => {

  var form = new formidable.IncomingForm()

  form.parse(req, (err, fields) => {

    console.log(fields)

    database.openDownloadStream(mongodb.ObjectId(fields.id)).pipe(fs.createWriteStream("./" + fields.name)).
    on('finish', () => {

      res.redirect('/')

    })
  })
})

// Delete file by id
app.post('/delete/id', (req, res) => {
  var form = new formidable.IncomingForm()

  form.parse(req, (err, fields) => {
    database.delete(mongodb.ObjectId(fields.id), () => {
      res.redirect('/')
    })
  })
})

// Upload file
app.post('/upload', (req, res) => {

  var form = new formidable.IncomingForm();

  // Parse form
  form.parse(req, function(err, fields, file) {

    // Check for errors
    if (err || file.file.name == "") return console.log("\nFile does not exists")

    // Saucy print statement
    console.log("\nUploading...", "\nPath:", __dirname + file.file.path, "\nName:", file.file.name)

    // Upload file to database
    fs.createReadStream(file.file.path).

    pipe(database.openUploadStream(file.file.name, {
      "metadata": fields.tags.split(",")
    })).

    // Log errors
    on('error', (err) => {
      if (err) console.log(err)
    }).

    // Log success message
    on('finish', function() {
      console.log(`Success! ${file.file.name} stored in database`);
      res.redirect('/')
    });
  });
})

//TODO: delete by contains tag <tag>, find by contains and find by exact
