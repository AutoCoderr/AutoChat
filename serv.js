var date = new Date();
console.log("server start at " + date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate() + "  " + date.getHours() + ':' + date.getMinutes() + ":" + date.getSeconds());
var http = require('http'),
    fs = require('fs'),
	url = require('url'),
    mysql = require('mysql'),
    md5 = require('md5'),
	path = require('path'),
    util = require('util'),
	//sizeOf = require('image-size'),
	EventEmitter = require('events').EventEmitter,
	
	colors = new Array("E7001A","E70077","8000E7","0500E7","0086E7","00E2E7",
	                   "00E778","95E700","E7BE00","E74200","BA3032","BA309B",
					   "6630BA","309BBA","30BA7C","52BA30","BAB330","BA4F30"),
	
    ban = new Array(),
    banip = new Array(),
    users = new Array(), 
    hist = new Array(),
	emiter = new EventEmitter(),
	idmsg = 0;
	

var con = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "ctrl980",
  database: "Server"
});
con.connect();
maintaincon();

con.query("SELECT * FROM users", function (err, result, fields) { // ---------------> RECUPERE LA BASE DE DONNEES <-------------------------------------------
    for (var i=0;i<result.length;i++) {
		//console.log (result[i].pseudo + "\n");
		//console.log (result[i].passwd + "\n \n");
		users.push({ pseudo: result[i].pseudo, passwd: result[i].passwd, perm: result[i].perm})
	}
	//console.log (ops);
	//emiter.emit('ok');
});

var presents = new Array({ pseudo: 'server', id: "0" });
var p = 0;


var server = http.createServer(function(req, res) { // --------------------------> LE SERVEUR HTTP <------------------------------------------------------
	var page = url.parse(req.url).pathname;
	var param = url.parse(req.url).query;
    if (page == "/") {
		page = "/index.html"
	} else if (page == "/socket.io/") {
		page = "/socket.io/socket.io.js"
	}
	page = "." + page
	var ext = page.split(".")[page.split(".").length-1]
	if (ext == "mp3") {
		fs.stat(page, function(error,stats) {
			if (error) {
				res.writeHead(404, {"Content-Type": "text/plain"});
                res.end("ERROR 404 : Page not found");
			} else {
				res.writeHead(200, {
				  'Content-Type': 'audio/mpeg',
				  'Content-Length': stats.size
                });
		        fs.createReadStream(page).pipe(res);
			}
		});
    } else if (ext == "png" | ext == "jpg" | ext == "gif" | ext == "jpeg" | ext == "bmp" | ext == "tif" | ext == "tiff") {
       fs.readFile(page, function(error, content) {
	     if(error){
	       res.writeHead(404, {"Content-Type": "text/plain"});
           res.end("ERROR 404 : Page not found");
	     } else {
		   res.writeHead(200, {"Content-Type": "image/" + ext});
		   res.end(content);
	     }
      });
    } else {	
		fs.readFile(page, 'utf-8', function(error, content) {
	   if(error){
	     res.writeHead(404, {"Content-Type": "text/plain"});
         res.end("ERROR 404 : Page not found");
	   } else {
		     if (page == "./serv.js") {
			     res.writeHead(404, {"Content-Type": "text/plain"});
                 res.end("ERROR 404 : Page not found");
		     } else {
			     res.writeHead(200, {"Content-Type": "text/html"});
			     res.end(content);
		     }
	   }
      });
	}
});

// Chargement de socket.io
var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {
    //console.log('Un(e) client(e) est connecté(e)!');
	socket.downloaded = 0;
	socket.data = "";
	socket.handler = 0;
	
	socket.on('msg', function (msg) { // --------------------------------> ENVOIE DE MESSAGE OU DE COMMANDE <--------------------------------------------
		// socket.broadcast.emit("msg", socket.pseudo + " : " + msg);
	    // socket.emit("msg", socket.pseudo + " : " + msg)
		if (typeof(socket.pseudo) != "undefined")
		{
	      if (typeof(msg) != "string"){
			  if (typeof(msg) == "undefined") {
				var msg = "";  
			  } else {
				msg = "";
			  }
		  }
		  var p = 0;
		  for (i=0;i<msg.length;i++){
			  if (msg[i] == "/") {
				  p = 1;
			  }
			  if (msg[i] != " " & msg[i] != "/") i = msg.length;
		  }
		  if (p == 0) {
			log(socket.pseudo,"envoie message",msg,remplace(socket.handshake.address,"::ffff:",""));
			msg = remplace(msg,"<","&lt;");
			msg = remplace(msg,">","&gt;");
			msg = msg.split(" ");
			for (i=0;i<msg.length;i++){
				if (msg[i][0]+msg[i][1]+msg[i][2]+msg[i][3]+msg[i][4]+msg[i][5]+msg[i][6] == "http://" 
				| msg[i][0]+msg[i][1]+msg[i][2]+msg[i][3]+msg[i][4]+msg[i][5]+msg[i][6]+msg[i][7] == "https://"){
					msg[i] = "<a target='_blank' href='"+msg[i]+"'>"+msg[i]+"</a>";
				}
			}
			msg = msg.join(" ");
			idmsg = idmsg + 1;
		    socket.emit('msg', { pseudo: socket.pseudo, content: msg, type: "msg", imp: "1", color: socket.color, id: idmsg });
		    socket.broadcast.emit('msg', { pseudo: socket.pseudo, content: msg, type: "msg", imp: "1", color: socket.color, id: idmsg });
			hist.push({ pseudo: socket.pseudo, content: msg, imp: "1", color: socket.color, id: idmsg });
		  } else {
			commands(socket,msg);
		  }
		} else {
			socket.emit('msg', { pseudo: "server", content: "Vous n'êtes pas connecté.", type: "msg", imp: "3" });
			console.log(remplace(socket.handshake.address,"::ffff:","") + " : Veut envoyer un message mais n'est pas connecté.");
		}
	});
	
	socket.on('Upload', function (data){ // --------------------------------> UPLOAD D'UNE IMAGE <---------------------------------------------------------
	    if (typeof(data) != "object") {
			socket.emit('repupload', { type: 'refused', raison: 'Erreur: variable incorrecte'});
			log(socket.pseudo,"Envoyer une image","Variable incorrecte",remplace(socket.handshake.address,"::ffff:",""));
		} else { 
	      if (typeof(data.name) != "string" | typeof(data.size) != "number" | typeof(data.data) != "string") {
			   socket.emit('repupload', { type: 'refused', raison: 'Erreur: variable incorrect'});
			   log(socket.pseudo,"Envoyer une image","Variable incorrecte",remplace(socket.handshake.address,"::ffff:",""));
	      } else {
			   if (socket.handler == 0) {
		         if(data.size >= 26214400) {
		           socket.emit('repupload', {type: 'refused', raison: 'Le fichier est trop gros'});
				   log(socket.pseudo,"Envoyer une image","Le fichier est trop gros",remplace(socket.handshake.address,"::ffff:",""));
		         } else {
                   data.ext = data.name.split(".")[data.name.split(".").length-1];
                   if (data.ext == "jpg" | data.ext == "png" | data.ext == "bmp" | data.ext == "jpeg" | data.ext == "gif" | data.ext == "tif" | data.ext == "tiff"){
		             data.num = 1;
	                 while (fs.existsSync("/media/server/xampp/tchat/server/imgs/" + data.name.split(".")[0] + data.num + "." + data.ext)) {
                        data.num += 1;
					 }
                     socket.filename = data.name.split(".")[0] + data.num + "." + data.ext
		             socket.handler = fs.openSync("/media/server/xampp/tchat/server/imgs/" + socket.filename, 'a')
		         } else {
                   socket.emit('repupload', { type: 'refused', raison: "Ce n'est pas une image" });
				   log(socket.pseudo,"Envoyer une image","Ce n'est pas une image",remplace(socket.handshake.address,"::ffff:",""));
                 }
		       }
              }
              if (socket.handler != 0) {
                if(data.size >= 26214400) {
                  socket.emit('repupload', {type: 'refused', raison: 'Le fichier est trop gros'});
                } else {
				  socket.downloaded += data.data.length;
                  socket.data += data.data;
		          if(socket.downloaded >= data.size) { //If File is Fully Uploaded
                    fs.write(socket.handler, socket.data, null, 'Binary', function(err, Writen){
                      socket.emit('repupload', {'type': 'finish'});
	                  idmsg = idmsg + 1;
		              socket.emit('msg', { pseudo: socket.pseudo, content: "<img width='200px' src='/imgs/" + socket.filename + "'/>", type: "msg", imp: "1", id: idmsg });
		              socket.broadcast.emit('msg', { pseudo: socket.pseudo, content: "<img width='200px' src='/imgs/" + socket.filename + "'/>", type: "msg", imp: "1", id: idmsg });
		              hist.push({ pseudo: socket.pseudo, content: "<img width='200px' src='/imgs/" + socket.filename + "'/>", imp: "1", id: idmsg });
		              log(socket.pseudo,"Envoyer image","a posté '" + socket.filename + "'",remplace(socket.handshake.address,"::ffff:",""));
		              socket.handler = 0;
	                  socket.downloaded = 0;
		              socket.filename = "";
		              socket.data = "";
		              //console.log("if 1");
                    });
                } else if(socket.data.length > 1048576){ //If the Data Buffer reaches 10MB
                  fs.write(socket.handler, socket.data, null, 'Binary', function(err, Writen){
                    socket.data = ""; //Reset The Buffer
                    socket.emit('repupload', { 'type': 'progress'
			                                 , 'place' :    socket.downloaded
				                             , 'percent' :  (socket.downloaded / data.size) * 100});
		            //console.log("if 2");
                  });
                } else {
                  socket.emit('repupload', { 'type': 'progress'
			                               , 'place' :    socket.downloaded
				                           , 'percent' :  (socket.downloaded / data.size) * 100});
	              //console.log("if 3");
	              //console.log(socket.downloaded);
                }
		     }  
          }
	    }
	  }
    });
	
	socket.on('newWpass', function (newWpass) { // ----------------------> CONNEXION AVEC MOT DE PASSE <---------------------------------------
	    if (typeof(newWpass) != "object") {
			if (typeof(newWpass) == "undefined") {
			  var newWpass = { pseudo: "", passwd: "" }
			} else {
			  newWpass = { pseudo: "", passwd: "" }
			}
		} else { 
	      if (typeof(newWpass.pseudo) != "string") {
			   newWpass.pseudo = "";
	      }
		  if (typeof(newWpass.passwd) != "string") {
			   newWpass.passwd = "";
	      }
		}
		var p = 0;
        for (i=0; i<presents.length; i++){
            if (presents[i].pseudo == newWpass.pseudo) {
                  p = 1;
               }
            }
	    if (p == 1) {
		   socket.emit('newWpass', { avi: 'NO', raison: 'Un utilisateur utilise actuellement ce pseudo.' });
		   socket.emit('msg', { pseudo: 'server', content: "Un utilisateur utilise actuellement ce pseudo.", type: "msg", imp: "3" });
		   log(newWpass.pseudo,"connexion avec mot de passe","Un utilisateur utilise déjà ce pseudo",remplace(socket.handshake.address,"::ffff:",""));
		} else {
		   p = 0;
		   for (var i=0;i<users.length;i++) {
		     if (newWpass.pseudo == users[i].pseudo & md5(newWpass.passwd) == users[i].passwd)
			  {
		       p = 1;
     		  }
	       }
		   if (p == 0)
		   {
		       socket.emit('newWpass', { avi: 'NO', raison: 'mot de passe et/ou pseudo incorrect' });
		       socket.emit('msg', { pseudo: 'server', content: "mot de passe et/ou pseudo incorrect", type: "msg", imp: "3" });
			   log(newWpass.pseudo,"connexion avec mot de passe","mot de passe et/ou pseudo incorrect",remplace(socket.handshake.address,"::ffff:",""));
		   } else {
			   var p = 0;
			   for (i=0;i<ban.length;i++){
				   if (ban[i] == newWpass.pseudo){
					   p = 1;
				   }
			   }
			   if (p == 0){
				 p = 0;
				 for (i=0;i<banip.length;i++){
                    if (banip[i].addr == socket.handshake.address){
					p = 1;
					}
				 }
				 if (p == 0){
				   socket.uid = Math.floor(1000000000*Math.random());
				   socket.color = colors[Math.round((colors.length-1)*Math.random())];
			       presents.push({ pseudo: newWpass.pseudo, id: socket.id, uid: socket.uid, color: socket.color });
		           socket.pseudo = newWpass.pseudo;
		           socket.emit('newWpass', { avi: 'OK', pseudo: socket.pseudo, uid: socket.uid });
		           //socket.broadcast.emit('msg', { pseudo: 'server', content: socket.pseudo + " est connecté(e)!", type: "msg", imp: "4", id: "" });
	               //socket.emit('msg', { pseudo: 'server', content: socket.pseudo + " est connecté(e)!", type: "msg", imp: "2", id: "" });
				   socket.broadcast.emit('msg', { pseudo: socket.pseudo, uid: socket.uid, color: socket.color, type: "connect" });
			       //hist.push({ pseudo: 'server', content: socket.pseudo + " est connecté(e)!", imp: "4", id: "" });
				   log(newWpass.pseudo,"connexion avec mot de passe","connexion réussi",remplace(socket.handshake.address,"::ffff:",""));
				 } else {
				   socket.emit('new', { avi: 'NO', raison: "Votre IP est bloquée" });
				   socket.emit('msg', { pseudo: 'server', content: "<strong>Votre IP est bloqué</strong>", type: "msg", imp: "3" });
				   log(newWpass.pseudo,"connexion avec mot de passe","IP bloquée",remplace(socket.handshake.address,"::ffff:",""));
				 }
			   } else {
				 socket.emit('new', { avi: 'NO', raison: "Vous êtes BANNIS" });
				 socket.emit('msg', { pseudo: 'server', content: "<strong>Vous êtes BANNIS</strong>", type: "msg", imp: "3" });
				 log(newWpass.pseudo,"connexion avec mot de passe","pseudo BANNIS",remplace(socket.handshake.address,"::ffff:",""));
			   }
		   }
		}
	});
	
	socket.on('new', function (pseudo) { // -------------------> CONNEXION SANS MOT DE PASSE <--------------------------------------
	   if (typeof(pseudo) != "string") {
		   if (typeof(pseudo) == "undefined"){
		     var pseudo = "";
		   } else {
			 pseudo = "";
		   }
	   }
       var p = 0;
       for (i=0; i<presents.length; i++){
         if (presents[i].pseudo == pseudo) {
              p = 1;
         }
       }
	   if (p == 1) {
		   socket.emit('new', { avi: 'NO', raison: 'Un utilisateur utilise actuellement ce pseudo.' });
		   socket.emit('msg', { pseudo: 'server', content: "Un utilisateur utilise actuellement ce pseudo.", type: "msg", imp: "3" });
		   log(pseudo,"Connexion sans mot de passe","Un utilisateur utilise déjà ce pseudo",remplace(socket.handshake.address,"::ffff:",""));
	   } else {
            var p = 0;
			for (var i=0;i<users.length;i++) {
		       if (pseudo == users[i].pseudo)
			   {
				   p = 1;
			   }
	         }
		   if (p == 1) {
				socket.emit('new', { avi: 'NO', raison: 'Ce pseudo a un mot de passe' });
		        socket.emit('msg', { pseudo: 'server', content: "Ce pseudo a un mot de passe", type: "msg", imp: "3" });
				log(pseudo,"Connexion sans mot de passe","Ce pseudo a un mot de passe",remplace(socket.handshake.address,"::ffff:",""));
			} else {
		        if (pseudo == "") {
			       pseudo = "user" + Math.floor(1000000*Math.random());
			       var b = 1;
			       while(b == 1) {
				     b = 0;
			         for (i=0; i<presents.length; i++){
                       if (presents[i].pseudo == pseudo) {
                           pseudo = "user" + Math.floor(1000000*Math.random());
					       b = 1;
                        }
                     }
                     for (i=0; i<users.length; i++){
                       if (users[i].pseudo == pseudo) {
                           pseudo = "user" + Math.floor(1000000*Math.random());
					       b = 1;
                        }
                     }
			       }
		       }
			   var p = 0;
			   for (i=0;i<ban.length;i++){
				   if (ban[i] == pseudo){
					   p = 1;
				   }
			   }
			   if (p == 0){
				 p = 0;
				 for (i=0;i<banip.length;i++){
                    if (banip[i].addr == socket.handshake.address){
					p = 1;
					}
				 }
				 if (p == 0){
				   socket.uid = Math.floor(1000000000*Math.random());
				   socket.color = colors[Math.round((colors.length-1)*Math.random())];
                   presents.push({ pseudo: pseudo, id: socket.id, uid: socket.uid, color: socket.color });
		           socket.pseudo = pseudo;
		           socket.emit('new', { avi: 'OK', pseudo: socket.pseudo, uid: socket.uid });
				   socket.broadcast.emit('msg', { pseudo: socket.pseudo, uid: socket.uid, color: socket.color, type: "connect" });
				   log(pseudo,"Connexion sans mot de passe","Connexion réussie",remplace(socket.handshake.address,"::ffff:",""));
				 } else {
				   socket.emit('new', { avi: 'NO', raison: "Votre IP est bloqué" });
				   socket.emit('msg', { pseudo: 'server', content: "<strong>Votre IP est bloqué</strong>", type: "msg", imp: "3" });
				   log(pseudo,"connexion sans mot de passe","IP bloqué",remplace(socket.handshake.address,"::ffff:",""));
				 }
			   } else {
				 socket.emit('new', { avi: 'NO', raison: "Vous êtes BANNIS" });
				 socket.emit('msg', { pseudo: 'server', content: "<strong>Vous êtes BANNIS</strong>", type: "msg", imp: "3" });
				 log(pseudo,"connexion sans mot de passe","Ce pseudo est BANNIS",remplace(socket.handshake.address,"::ffff:",""));
			   }
	     }
	    }
      });
	 
	socket.on('NewACC', function (NewACC) { // ----------------------> CREATION D'UN COMPTE <---------------------------------------
	    if (typeof(NewACC) != "object") {
			if (typeof(NewACC) == "undefined") {
			  var NewACC = { pseudo: "", passwd: "" }
			} else {
			  NewACC = { pseudo: "", passwd: "" }
			}
		} else { 
	      if (typeof(NewACC.pseudo) != "string") {
			   NewACC.pseudo = "";
	      }
		  if (typeof(NewACC.passwd) != "string") {
			   NewACC.passwd = "";
	      }
		}
	    if (NewACC.pseudo != "" & NewACC.passwd != "") {
		  var p = 0;
	      for (i=0; i<users.length; i++) {
	        if (users[i].pseudo == NewACC.pseudo) {
		        p = 1;
		    }
	     }
	      if (p == 0) {
			 if (NewACC.pseudo.length <= 30 & NewACC.passwd.length <= 30) {
			   users.push({ pseudo: NewACC.pseudo, passwd: md5(NewACC.passwd), perm: "000000"});
			   con.query("INSERT INTO users VALUE (0, '" + NewACC.pseudo + "', '" + md5(NewACC.passwd) + "','000000')");
			   socket.emit('msg', { pseudo: 'server', content: "Le compte '" + NewACC.pseudo + "' a été créé avec succès!", type: "msg", imp: "2" });
			   log(NewACC.pseudo,"Création de compte","Compte créé avec succès",remplace(socket.handshake.address,"::ffff:",""));
			   
			   var p = 0;
               for (i=0; i<presents.length; i++){
                 if (presents[i].pseudo == NewACC.pseudo) {
                       p = 1;
                 }
               }
	           if (p == 1) {
		         socket.emit("NewACC", { avi: 'NO2', raison: 'Compte créé avec succès, mais un utilisateur sans mot de passe utilisait déjà ce pseudo.' });
		         socket.emit("msg", { pseudo: 'server', content: "Compte créé avec succès, mais un utilisateur sans mot de passe utilisait déjà ce pseudo.", type: "msg", imp: "3" });
		         log(NewACC.pseudo,"Création de compte","Un utilisateur utilise déjà ce pseudo.",remplace(socket.handshake.address,"::ffff:",""));
		       } else {
				 socket.uid = Math.floor(1000000000*Math.random());
				 socket.color = colors[Math.round((colors.length-1)*Math.random())];
			     presents.push({ pseudo: NewACC.pseudo, id: socket.id, uid: socket.uid, color: socket.color });
		         socket.pseudo = NewACC.pseudo;
		         socket.emit('NewACC', { avi: 'OK', pseudo: socket.pseudo, uid: socket.uid });
		         //socket.broadcast.emit('msg', { pseudo: 'server', content: socket.pseudo + " est connecté(e)!", type: "msg", imp: "4", id: "" });
	             //socket.emit('msg', { pseudo: 'server', content: socket.pseudo + " est connecté(e)!", type: "msg", imp: "2", id: "" });
				 socket.broadcast.emit('msg', { pseudo: socket.pseudo, uid: socket.uid, color: socket.color, type: "connect" });
			     //hist.push({ pseudo: 'server', content: socket.pseudo + " est connecté(e)!", imp: "4", id: "" });
	             log(NewACC.pseudo,"Création de compte","Connexion réussi!",remplace(socket.handshake.address,"::ffff:",""));
		       }
			 } else {
			   socket.emit('msg', { pseudo: 'server', content: "Le pseudo et le mot de passe doivent faires moins de 30 caractères.", type: "msg", imp: "3" });
			   socket.emit("NewACC", { avi: "NO1" });
			   log(NewACC.pseudo,"Création de compte","Le pseudo et le mot de passe doivent faires moins de 30 caractères",remplace(socket.handshake.address,"::ffff:",""));
			 }
		  } else if (p == 1) {
			socket.emit('msg', { pseudo: 'server', content: "Cet utilisateur existe déjà", type: "msg", imp: "3" });
			socket.emit("NewACC", { avi: "NO1" });
			log(NewACC.pseudo,"Création de compte","Cet utilisateur existe déjà",remplace(socket.handshake.address,"::ffff:",""));
		  }
		} else {
	      socket.emit("NewACC", { avi: "NO1" });
		  socket.emit("msg", { pseudo: "server", content: "Aucun des champs ne doit être vide.", type: "msg", imp: "3" });
		  log(NewACC.pseudo,"Création de compte","Aucun champs ne doit être vide",remplace(socket.handshake.address,"::ffff:",""));
		}
	});
	
	socket.on("changepass", function (changepass) { // ----------------------> CHANGEMENT DE MOT DE PASSE <---------------------------------------
	    if (typeof(changepass) != "object") {
			if (typeof(changepass) == "undefined") {
			  var changepass = { pseudo: "", passwd: "", oldpasswd: "" };
			} else {
			  changepass = { pseudo: "", passwd: "", oldpasswd: "" };
			}
		} else { 
	      if (typeof(changepass.pseudo) != "string") {
			   changepass.pseudo = "";
	      }
		  if (typeof(changepass.passwd) != "string") {
			   changepass.passwd = "";
	      }
		  if (typeof(changepass.oldpasswd) != "string") {
			   changepass.oldpasswd = "";
	      }
		}
		if (changepass.pseudo != "" & changepass.passwd != "" & changepass.oldpasswd != "") {
		  var p = 0;
		  for (i=0;i<users.length;i++) {
			  if (users[i].pseudo == changepass.pseudo & users[i].passwd == md5(changepass.oldpasswd)) {
				  p = 1;
			  }
		  }
		  if (p == 1) {
			  con.query("UPDATE users SET passwd = '" + md5(changepass.passwd) + "' WHERE pseudo = '" + changepass.pseudo + "';");
			  socket.emit("changepass", { avi: "OK" } );
			  socket.emit("msg", { pseudo: "server", content: "Mot de passe changé avec succès!", type: "msg", imp: "2" })
			  log(changepass.pseudo,"Changement de mot de passe","Mot de passe changé avec succès!",remplace(socket.handshake.address,"::ffff:",""));
		  } else {
			  socket.emit("changepass", { avi: "NO" } );
		      socket.emit("msg", { pseudo: "server", content: "Ancien mot de passe et/ou pseudo incorrect.", type: "msg", imp: "3"})
			  log(changepass.pseudo,"Changement de mot de passe","Ancien mot de passe et/ou pseudo incorrect",remplace(socket.handshake.address,"::ffff:",""));
		  }
		} else {
		  socket.emit("changepass", { avi: "NO" } );
		  socket.emit("msg", { pseudo: "server", content: "Aucun des champs ne doit être vide.", type: "msg", imp: "3"})
		  log(changepass.pseudo,"Changement de mot de passe","Aucun des champs ne doit être vide",remplace(socket.handshake.address,"::ffff:",""));
		}
	});
	
	socket.on('hist', function() { // ------------------------> ENVOIE L'HISTORIQUE <---------------------------
	    if (typeof(socket.pseudo) != "undefined") {
			  //console.log("type connecteds");
			  var i = 0;
			  while(i<presents.length) {
				  //console.log("while");
				  if (presents[i].pseudo != "server" & presents[i].pseudo != socket.pseudo) {
				     socket.emit('msg', { pseudo: presents[i].pseudo, uid: presents[i].uid, color: presents[i].color, type: "connect" });
				     //console.log("send : pseudo: " + presents[i].pseudo + " uid: " + presents[i].uid + " type: connect" );
				  }
				  i += 1;
			  }
			  //socket.emit('hist', { type: "connectfinish" });
			  //console.log("type messages");
			  //console.log(hist.length);
			  i = 0
			  while (i<hist.length) {
				 //console.log("send messages")
			     socket.emit('msg', { pseudo: hist[i].pseudo, content: hist[i].content, type: "hist", imp: hist[i].imp, color: hist[i].color, id: hist[i].id });
			     i += 1;
			  }
			  socket.emit('hist');
		}
	});
	   

        socket.on('disconnect', function() { // ----------------------> DECONNEXION D'UN CLIENT <---------------------------------------
			if (typeof(socket.pseudo) != "undefined")
			{
             for (i=0; i<presents.length; i++){
                if (presents[i].pseudo == socket.pseudo) {
					 //console.log("before : " + presents);
                     presents.splice(i,i);
					 //console.log("after : " + presents);
                  }
             }
             //socket.broadcast.emit('msg', { pseudo: 'server', content: socket.pseudo + " s'est deconnecté(e)", type: "msg", imp: "4", id: "" });
			 //hist.push({ pseudo: 'server', content: socket.pseudo + " s'est deconnecté(e)", imp: "4", id: "" });
			 socket.broadcast.emit('msg', { uid: socket.uid, type: "disconnect"});
			 log(socket.pseudo,"Deconnexion","S'est deconnecté(e)",remplace(socket.handshake.address,"::ffff:",""));
			}
        });
});

function commands(socket,command0) { // -------------------------------> TOUTES LES COMMANDES <---------------------------------------------
	socket.cmd = 0;
	var command = new Array();
	var s = 0;
	for (var i=0;i<command0.split(" ").length;i++){
		if (command0.split(" ")[i][0] == "/") {
			s = 1;
		}
		if (s == 1){
			command.push(command0.split(" ")[i]);
		}
	}
	switch (command[0]) {
		case "/exit": // --------------------------------> DEBUT COMMANDE "/exit" <----------------------------------------------
		  socket.cmd = 1
		  socket.emit('msg', { pseudo: 'server', content: '<script>window.location.reload();</script>', type: "command", imp: '4'});
		  break; // --------------------------------> FIN COMMANDE "/exit" <-------------------------------------------
		  
		case "/help": // --------------------------------> DEBUT COMMANDE "/help" <------------------------------------------------
		  socket.cmd = 1
		  socket.emit('msg', { pseudo: 'server', content: "il y a 11 commandes en tout :<br>/exit : se deconnecter (ne neccesite aucune permissions)<br>/surlign : surligne votre message afin qu'il soit mis en avant (pour les modérateurs)<br>/suppr : supprime un ou plusieurs messages (pour les modérateur)<br>/kick : virer quelqu'un (pour les modérateurs)<br>/ban et /pardon : bannir ou pardonner quelqu'un par son pseudo (pour les modérateurs)<br>/banip et /pardonip : bannir ou pardonner quelqu'un par son IP (pour les modérateurs)<br>/adduser et /userdel : ajouter ou supprimer un utilisateur (pour les admins)<br>/alter : modifier les permissions ou le mot de passe de quelqu'un (pour les admins)<br>/help : affiche cette aide", type: "msg", imp: "4" });
		  log(socket.pseudo,"/help","Demande de l'aide pour les commande",remplace(socket.handshake.address,"::ffff:",""));
		  break; // -------------------------------------> FIN COMMANDE "/help" <--------------------------------------------------
		  
		case "/adduser": // -------------------------------> DEBUT COMMANDE "/adduser" <---------------------------------------
		  socket.cmd = 1
		  socket.perm = 0
		  for (i=0; i<users.length; i++){
			  if (users[i].pseudo == socket.pseudo & users[i].perm[5] == "1") {
				  socket.perm = 1;
		      }
		  }
		  if (socket.perm == 1) {
            var args = getargs(command);
		    if (args.length != 3 | args[2] == "") {
			    socket.emit('msg', { pseudo: 'server', content: 'la syntaxe de cette commande est : /adduser "utilisateur" "mot de passe" "permissions" <br><br> permissions = 6 bits correspondant aux commandes: <br> /surlign  = 1er bit<br>/suppr = 2eme bit<br>/kick = 3eme bit<br>/ban et /pardon = 4eme bit<br>/banip et /pardonip = 5eme bit<br>/adduser, /userdel et /alter = 6eme bit<br> exemple : /adduser toto abcdef$ 000001, toto pourras seulement utiliser les commandes /adduser, /userdel et /alter', type: "msg", imp: "3" });
				log(socket.pseudo,"/adduser","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
		    } else if (args[2].length != 6){
                socket.emit('msg', { pseudo: 'server', content: 'la syntaxe de cette commande est : /adduser "utilisateur" "mot de passe" "permissions" <br><br> permissions = 6 bits correspondant aux commandes: <br> /surlign  = 1er bit<br>/suppr = 2eme bit<br>/kick = 3eme bit<br>/ban et /pardon = 4eme bit<br>/banip et /pardonip = 5eme bit<br>/adduser, /userdel et /alter = 6eme bit<br> exemple : /adduser toto abcdef$ 000001, toto pourras seulement utiliser les commandes /adduser, /userdel et /alter', type: "msg", imp: "3" });
				log(socket.pseudo,"/adduser","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
		    } else {
			      var p = 0
	              for (i=0; i<users.length; i++) {
			        if (users[i].pseudo == args[0]) {
				        p = 1;
				    }
			      }
			      if (p == 0) {
					   if (command[2].length <= 30 & command[3].length <= 30) {
				         users.push({ pseudo: args[0], passwd: md5(args[1]), perm: args[2]});
			             con.query("INSERT INTO users VALUE (0, '" + args[0] + "', '" + md5(args[1]) + "','" + args[2] + "');");
				         socket.emit('msg', { pseudo: 'server', content: "L'utilisateur " + args[0] + " a été ajouté avec succés!", type: "msg", imp: "2" });
				         log(socket.pseudo,"/adduser",args[0] + " créé avec succès",remplace(socket.handshake.address,"::ffff:",""));
					   } else {
						 socket.emit('msg', { pseudo: 'server', content: "Le pseudo et le mot de passe doivent faires moins de 30 caractères.", type: "msg", imp: "3" });
						 log(socket.pseudo,"/adduser","Le pseudo et le mot de passe doivent faires moins de 30 caractères",remplace(socket.handshake.address,"::ffff:",""));
					   }
			      } else if (p == 1) {
				     socket.emit('msg', { pseudo: 'server', content: "Cet utilisateur existe déjà", type: "msg", imp: "3" });
					 log(socket.pseudo,"/adduser",args[0] + " existe déjà",remplace(socket.handshake.address,"::ffff:",""));
			      }
		     }
		   } else if (socket.perm == 0) {
			     socket.emit('msg', { pseudo: 'server', content: "vous ne semblez pas avoir les permissions necéssaires.", type: "msg", imp: "3" });
				 log(socket.pseudo,"/adduser","Permissions insuffisantes",remplace(socket.handshake.address,"::ffff:",""));
		   }
		  break; // ---------------------------------------> FIN COMMANDE "/adduser" <-------------------------------------------------------
		  
		case "/userdel": // -------------------------------> DEBUT COMMANDE "/userdel" <---------------------------------------
		  socket.cmd = 1
		  socket.perm = 0
		  for (i=0; i<users.length; i++){
	         if (users[i].pseudo == socket.pseudo & users[i].perm[5] == "1") {
			    socket.perm = 1;
	       }
    	 }
		  if (socket.perm == 1) {
			var args = getargs(command);
		    if (typeof(args[0]) != "undefined" & args[0] != "") {
			      var p = 0
	              for (i=0; i<users.length; i++) {
			        if (users[i].pseudo == args[0]) {
				        p = 1;
				    }
			      }
			      if (p == 1) {
			           con.query("DELETE FROM users WHERE pseudo = '" + args[0] + "'");
					   for (i=0; i<users.length; i++){
                         if (users[i].pseudo == args[0]) {
                           users.splice(i);
                          }
                        }
					   socket.emit('msg', { pseudo: 'server', content: "L'utilisateur " + args[0] + " a été suprimmé avec succès!", type: "msg", imp: "2" });
				       log(socket.pseudo,"/userdel",args[0] + " suprimmé avec succès",remplace(socket.handshake.address,"::ffff:",""));
			      } else if (p == 0) {
				     socket.emit('msg', { pseudo: 'server', content: "Cet utilisateur n'existe pas.", type: "msg", imp: "3" });
					 log(socket.pseudo,"/userdel",args[0] + " n'existe pas",remplace(socket.handshake.address,"::ffff:",""));
			      }
		     } else {
			     socket.emit('msg', { pseudo: 'server', content: "la syntaxe de cette commande est : /userdel 'utilisateur'", type: "msg", imp: "3" });
				 log(socket.pseudo,"/userdel","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
		     }
		  } else if (socket.perm == 0){
			socket.emit('msg', { pseudo: 'server', content: "vous ne semblez pas avoir les permissions necéssaires.", type: "msg", imp: "3" });
			log(socket.pseudo,"/userdel","Permissions insuffisantes",remplace(socket.handshake.address,"::ffff:",""));
		  }
		  break; // ---------------------------------------> FIN COMMANDE "/userdel" <-------------------------------------------------------
		case "/surlign": // --------------------------------> DEBUT COMMANDE "/surlign" <-------------------------------------------------
                  socket.cmd = 1;
                  socket.perm = 0;
                  for (i=0; i<users.length; i++){
                          if (users[i].pseudo == socket.pseudo & users[i].perm[0] == "1") {
                                  socket.perm = 1;
                     }
                  }
                  if (socket.perm == 1) {
		            if (typeof(command[1]) != "undefined" & command[1] != "") {
				          var msg = command[1];
                          for (i=2;i<command.length;i++) {
                            msg = msg + " " + command[i];
                          }
                          msg = remplace(msg,"<","&lt;");
						  msg = remplace(msg,">","&gt;");
						  idmsg = idmsg + 1;
                          socket.emit('msg', { pseudo: socket.pseudo, content: msg, type: "msg", imp: "5", color: socket.color, id: idmsg });
                          socket.broadcast.emit('msg', { pseudo: socket.pseudo, content: msg, type: "msg", imp: "5", color: socket.color, id: idmsg });
                          hist.push({ pseudo: socket.pseudo, content: msg, imp: "5", color: socket.color, id: idmsg });
						  log(socket.pseudo,"/surlign",msg,remplace(socket.handshake.address,"::ffff:",""));
                     } else {
                          socket.emit('msg', { pseudo: 'server', content: "la syntaxe de cette commande est : /surlign 'le message'", type: "msg", imp: "3" });
						  log(socket.pseudo,"/surlign","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
                     }
                  } else if (socket.perm == 0) {
                    socket.emit('msg', { pseudo: 'server', content: "vous ne semblez pas avoir les permissions necéssaires.", type: "msg", imp: "3" });
					log(socket.pseudo,"/surlign","Permissions insuffisantes",remplace(socket.handshake.address,"::ffff:",""));
                  }
		  break; // ---------------------------------------> FIN COMMANDE "/surlign" <-------------------------------------------------
		case "/suppr": // ---------------------------------> DEBUT COMMANDE "/suppr" <--------------------------------------------------
		  socket.cmd = 1;
          socket.perm = 0;
          for (i=0; i<users.length; i++){
             if (users[i].pseudo == socket.pseudo & users[i].perm[1] == "1") {
                   socket.perm = 1;
             }
          }
          if (socket.perm == 1) {
			 if (typeof(command[1]) != "undefined" & command[1] != "") {
				 var ids = command[1].split(","); 
				 var pj;
				 for (i=0;i<ids.length;i++){
					 if (ids[i] != remplace(ids[i],"-","")) {
						 //console.log("if 1");
						 var a = parseInt(ids[i].split("-")[0]);
						 var b = parseInt(ids[i].split("-")[1]);
						 var min;
						 var max;
						 if (a>b) {
							 //console.log("if 2");
							 max = a;
							 min = b;
						 } else {
							 //console.log("if 3");
							 max = b;
							 min = a;
						 }
						 for (var k=min;k<=max;k++) {
							//console.log(k);
							pj = 0;
					        for(var l=0;l<hist.length;l++){
						      if (hist[l].id == k){
							    pj = 1;
							    socket.emit("msg", { content: "<script>$('#msg" + k + "').empty(); $('#msg" + k + "').append('<td bgcolor=#003333></td><td><strong><font size=4>" + hist[l].pseudo + ":</font></strong></td><td><strong>Supprimé par un modérateur.</strong></td>');</script>", type: "command"});
							    socket.broadcast.emit("msg", { content: "<script>$('#msg" + k + "').empty(); $('#msg" + k + "').append('<td bgcolor=#003333></td><td><strong><font size=4>" + hist[l].pseudo + ":</font></strong></td><td><strong>Supprimé par un modérateur.</strong></td>');</script>", type: "command"});
								log(socket.pseudo,"/suppr","Supprime <" + hist[l].pseudo + " : " + hist[l].content + " >",remplace(socket.handshake.address,"::ffff:",""));
							    hist[l].content = "<strong>Supprimé par un modérateur.</strong>";
							    hist[l].id = "";
						      }
					        }
					        if (pj == 0) {
						    socket.emit('msg', { pseudo: 'server', content: "le message numéro " + k + " n'existe pas.", type: "msg", imp: "3" });
							log(socket.pseudo,"/suppr","Le message numero " + k + "",remplace(socket.handshake.address,"::ffff:",""));
					        } 
						}
					 } else {
					 pj = 0;
					 for(var j=0;j<hist.length;j++){
						 if (hist[j].id == ids[i] & ids[i] != ""){
							 pj = 1;
							 socket.emit("msg", { content: "<script>$('#msg" + ids[i] + "').empty(); $('#msg" + ids[i] + "').append('<td bgcolor=#003333></td><td><strong><font size=4>" + hist[j].pseudo + ":</font></strong></td><td><strong>Supprimé par un modérateur.</strong></td>');</script>", type: "command"});
							 socket.broadcast.emit("msg", { content: "<script>$('#msg" + ids[i] + "').empty(); $('#msg" + ids[i] + "').append('<td bgcolor=#003333></td><td><strong><font size=4>" + hist[j].pseudo + ":</font></strong></td><td><strong>Supprimé par un modérateur.</strong></td>');</script>", type: "command"});
							 log(socket.pseudo,"/suppr","Supprime <" + hist[j].pseudo + " : " + hist[j].content + " >",remplace(socket.handshake.address,"::ffff:",""));
							 hist[j].content = "<strong>Supprimé par un modérateur.</strong>";
							 hist[j].id = "";
						 }
					 }
					 if (pj == 0) {
						 log(socket.pseudo,"/suppr","Le message numero " + ids[i] + " n'existe pas",remplace(socket.handshake.address,"::ffff:",""));
					 }
				   }
				 }
              } else {
                socket.emit('msg', { pseudo: 'server', content: "la syntaxe de cette commande est : /suppr 'id du message'<br>il est également possible de supprimer plusieur message<br>exemple : /suppr 1,4 pour suprimer le 1 et le 4 <br>ou /suppr 5-9 pour suprimer tous les messages du 5 au 9", type: "msg", imp: "3" });
				log(socket.pseudo,"/suppr","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
			  }
		  } else if (socket.perm == 0) {
		     socket.emit('msg', { pseudo: 'server', content: "vous ne semblez pas avoir les permissions necéssaires.", type: "msg", imp: "3" });
			 log(socket.pseudo,"/suppr","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
   	      }
          break; // -----------------------------------> FIN COMMANDE "/suppr" <--------------------------------------------------------	   
		case "/kick": // -------------------------------> DEBUT COMMANDE "/kick" <---------------------------------------------------------
		  socket.cmd = 1;
          socket.perm = 0;
          for (i=0; i<users.length; i++){
             if (users[i].pseudo == socket.pseudo & users[i].perm[2] == "1") {
                   socket.perm = 1;
             }
          }
          if (socket.perm == 1) {
			 var args = getargs(command);
			 if (typeof(args[0]) != "undefined" & args[0] != "") {
				var dst;
				var p = 0;
				for (i=0;i<presents.length;i++) {
					if (args[0] == presents[i].pseudo) {
						p = 1;
						dst = presents[i].id;
					}
				}
				if (p == 1) {
					io.sockets.connected[dst].emit('msg', { pseudo: 'server', content: '<strong>Vous avez été kické</strong>', type: "msg", imp: '3'});
					setTimeout(function() {
						io.sockets.connected[dst].emit('msg', { pseudo: 'server', content: '<script>window.location.reload();</script>', type: "command", imp: '4'});
					    io.sockets.connected[dst].disconnect();
						socket.emit('msg', { pseudo: 'server', content: args[0] + " a été kické avec succès!", type: "msg", imp: "2" });
						log(socket.pseudo,"/kick",args[0] + " kické avec succès",remplace(socket.handshake.address,"::ffff:",""));
					}, 1000);
				} else {
					socket.emit('msg', { pseudo: 'server', content: args[0] + " n'est pas connecté", type: "msg", imp: "3" });
					log(socket.pseudo,"/kick",args[0] + " n'est pas connecté",remplace(socket.handshake.address,"::ffff:",""));
				}
			 } else {
				socket.emit('msg', { pseudo: 'server', content: 'la syntaxe de cette commande est : /kick "le pseudo"', type: "msg", imp: "3" });
				log(socket.pseudo,"/kick","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
			 }
		  } else {
			 socket.emit('msg', { pseudo: 'server', content: "vous ne semblez pas avoir les permissions necéssaires.", type: "msg", imp: "3" });
			 log(socket.pseudo,"/kick","Permissions insuffisantes",remplace(socket.handshake.address,"::ffff:",""));
		  }
		  break; // ------------------------------------->FIN COMMANDE "/kick" <-----------------------------------------------
		case "/ban": // ---------------------------------> DEBUT COMMANDE "/ban" <-------------------------------------------------
		  socket.cmd = 1;
          socket.perm = 0;
		  for (i=0; i<users.length; i++){
             if (users[i].pseudo == socket.pseudo & users[i].perm[3] == "1") {
                   socket.perm = 1;
             }
          }
          if (socket.perm == 1) {
			  var args = getargs(command);
			  if (typeof(args[0]) != "undefined" & args[0] != "") {
				  var curlevel = 0;
				  for (i=0;i<users.length;i++){
					  if (socket.pseudo == users[i].pseudo){
						  curlevel = (parseInt(users[i].perm[0]) + (parseInt(users[i].perm[1])*2) + (parseInt(users[i].perm[2])*3) + (parseInt(users[i].perm[3])*4) + (parseInt(users[i].perm[4])*5))
					  }
				  }
				  var p = 0;
				  for (i=0;i<users.length;i++){
					  if ((users[i].pseudo == args[0]) & (0+(parseInt(users[i].perm[0]) + (parseInt(users[i].perm[1])*2) + (parseInt(users[i].perm[2])*3) + (parseInt(users[i].perm[3])*4) + (parseInt(users[i].perm[4])*5)) >= curlevel)){
						  p = 1;
					  }
				  }
				  if (p == 1){
					  socket.emit('msg', { pseudo: 'server', content: args[0] + " a plus ou autant de droits que vous.", type: "msg", imp: "3" });
					  log(socket.pseudo,"/ban",args[0] + " a plus ou autout de droit",remplace(socket.handshake.address,"::ffff:",""));
				  } else {
					  ban.push(args[0]);
					  var dst;
				      p = 0;
				      for (i=0;i<presents.length;i++) {
					    if (args[0] == presents[i].pseudo) {
						  p = 1;
						  dst = presents[i].id;
					    }
				      }
				      if (p == 1) {
					    io.sockets.connected[dst].emit('msg', { pseudo: 'server', content: '<strong>Vous avez été BANNIS</strong>', type: "msg", imp: '3'});
					    setTimeout(function() {
			    	      io.sockets.connected[dst].emit('msg', { pseudo: 'server', content: '<script>window.location.reload();</script>', type: "command", imp: '4'});
			              io.sockets.connected[dst].disconnect();
					    }, 1000);
				      }
					  socket.emit('msg', { pseudo: 'server', content: args[0] + " a été bannis avec succès!", type: "msg", imp: "2" });
					  socket.emit('msg', { pseudo: 'server', content: "Utilisez la commande /pardon pour le pardonner", type: "msg", imp: "4" });
					  socket.broadcast.emit('msg', { pseudo: 'server', content: args[0] + " est bannis", type: "msg", imp: "4", id: "" });
					  hist.push({ pseudo: 'server', content: args[0] + " est bannis", imp: "4", id: "" });
					  log(socket.pseudo,"/ban",args[0] + " a été bannis avec succès!",remplace(socket.handshake.address,"::ffff:",""));
				  }
			  } else {
				  socket.emit('msg', { pseudo: 'server', content: "La syntaxe de cette commande est : /ban 'le pseudo'", type: "msg", imp: "3" });
				  log(socket.pseudo,"/ban","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
			  }
		  } else {
			  socket.emit('msg', { pseudo: 'server', content: "Vous ne semblez pas avoir les permissions necéssaires.", type: "msg", imp: "3" });
			  log(socket.pseudo,"/ban","Permissions insuffisantes",remplace(socket.handshake.address,"::ffff:",""));
		  }
		  break; // -------------------------------------> FIN COMMANDE "/ban" <--------------------------------------------------
		case "/pardon": // ------------------------------> DEBUT COMMANDE "/pardon" <---------------------------------------------
		  socket.cmd = 1;
          socket.perm = 0;
		  for (i=0; i<users.length; i++){
             if (users[i].pseudo == socket.pseudo & users[i].perm[3] == "1") {
                   socket.perm = 1;
             }
          }
          if (socket.perm == 1) {
			  var args = getargs(command);
			  if (typeof(args[0]) != "undefined" & args[0] != "") {
				  var p = 0;
				  for (i=0;i<ban.length;i++){
					  if (args[0] == ban[i]){
						  p = 1;
						  ban.splice(i);
					  }
				  }
				  if (p == 1){
					  socket.emit('msg', { pseudo: 'server', content: "L'utilisateur " + args[0] + " a été pardonné avec succès!", type: "msg", imp:"2" });
					  log(socket.pseudo,"/pardon",args[0] + " a été pardonné avec succès",remplace(socket.handshake.address,"::ffff:",""));
				  } else {
					  socket.emit('msg', { pseudo: 'server', content: "L'utilisateur " + args[0] + " ne peut pas être pardonné car il n'est pas bannis!", type: "msg", imp:"3" });
					  log(socket.pseudo,"/pardon",args[0] + " ne peut pas être pardonné car il n'est pas bannis",remplace(socket.handshake.address,"::ffff:",""));
				  }
			  } else {
				  socket.emit('msg', { pseudo: 'server', content: "La syntaxe de cette commande est : /pardon 'le pseudo'", type: "msg", imp: "3" });
				  log(socket.pseudo,"/pardon","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
			  }
		  } else {
			  socket.emit('msg', { pseudo: 'server', content: "Vous ne semblez pas avoir les permissions necéssaires.", type: "msg", imp: "3" });
			  log(socket.pseudo,"/pardon","Permissions insuffisantes",remplace(socket.handshake.address,"::ffff:",""));
		  }
		  break; // -----------------------------------> FIN COMMANDE "/pardon" <----------------------------------------------------------
		case "/banip": // -----------------------------> DEBUT COMMANDE "/banip" <--------------------------------------------------
		  socket.cmd = 1;
          socket.perm = 0;
		  for (i=0; i<users.length; i++){
             if (users[i].pseudo == socket.pseudo & users[i].perm[4] == "1") {
                   socket.perm = 1;
             }
          }
          if (socket.perm == 1) {
			  var args = getargs(command);
			  if (typeof(args[0]) != "undefined" & args[0] != "") {
				  var curlevel = 0;
				  for (i=0;i<users.length;i++){
					  if (socket.pseudo == users[i].pseudo){
						  curlevel = (parseInt(users[i].perm[0]) + (parseInt(users[i].perm[1])*2) + (parseInt(users[i].perm[2])*3) + (parseInt(users[i].perm[3])*4) + (parseInt(users[i].perm[4])*5));
					  }
				  }
				  var p = 0;
				  for (i=0;i<users.length;i++){
					  if ((users[i].pseudo == args[0]) & (0+(parseInt(users[i].perm[0]) + (parseInt(users[i].perm[1])*2) + (parseInt(users[i].perm[2])*3) + (parseInt(users[i].perm[3])*4) + (parseInt(users[i].perm[4])*5)) >= curlevel)){
						  p = 1;
					  }
				  }
				  if (p == 1){
					  socket.emit('msg', { pseudo: 'server', content: args[0] + " a plus ou autant de droits que vous.", type: "msg", imp: "3" });
					  log(socket.pseudo,"/banip",args[0] + " a plus ou autant de droits",remplace(socket.handshake.address,"::ffff:",""));
				  } else {
					  var dst;
				      p = 0;
				      for (i=0;i<presents.length;i++) {
					    if (args[0] == presents[i].pseudo) {
						  p = 1;
						  dst = presents[i].id;
					    }
				      }
				      if (p == 1) {
					    banip.push({ pseudo: args[0], addr: io.sockets.connected[dst].handshake.address });
						console.log(remplace(io.sockets.connected[dst].handshake.address,"::ffff:","") + "/" + args[0] + " est bloqué.");
						socket.emit('msg', { pseudo: 'server', content: args[0] + " a été bannis par son adresse ip avec succès!", type: "msg", imp: "2" });
						socket.emit('msg', { pseudo: 'server', content: "Utilisez la commande /pardonip pour le pardonner", type: "msg", imp: "4" });
					    io.sockets.connected[dst].emit('msg', { pseudo: 'server', content: '<strong>Votre IP a été BLOQUÉE</strong>', type: "msg", imp: '3' });
						log(socket.pseudo,"/banip",args[0] + " à été bannis par son IP avec succès",remplace(socket.handshake.address,"::ffff:",""));
					    setTimeout(function() {
			    	      io.sockets.connected[dst].emit('msg', { pseudo: 'server', content: '<script>window.location.reload();</script>', type: "command", imp: '4' });
			              io.sockets.connected[dst].disconnect();
					    }, 1000);
				      } else {
						ban.push(args[0]);
						socket.emit('msg', { pseudo: 'server', content: args[0] + " a été bannis avec succès!", type: "msg", imp: "2" });
						socket.emit('msg', { pseudo: 'server', content: args[0] + " est déconnecté donc c'est impossible de connaitre son IP, il est donc uniquement bannis par son pseudo", type: "msg", imp: "4" });
						socket.emit('msg', { pseudo: 'server', content: "le pardonner se fera avec la commande /pardon", type: "msg", imp: "4" });
						log(socket.pseudo,"/banip",args[0] + " a été bannis par son pseudo car il est déconnecté",remplace(socket.handshake.address,"::ffff:",""));
					  }
					  socket.broadcast.emit('msg', { pseudo: 'server', content: args[0] + " est bannis", type: "msg", imp: "4", id: "" });
					  hist.push({ pseudo: 'server', content: args[0] + " est bannis", imp: "4", id: "" });
				  }
			  } else {
				  socket.emit('msg', { pseudo: 'server', content: "La syntaxe de cette commande est : /banip 'le pseudo'", type: "msg", imp: "3" });
				  log(socket.pseudo,"/banip","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
			  }
		  } else {
			  socket.emit('msg', { pseudo: 'server', content: "Vous ne semblez pas avoir les permissions necéssaires.", type: "msg", imp: "3" });
			  log(socket.pseudo,"/banip","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
		  }
		  break; // -----------------------------------> FIN COMMANDE "/banip" <--------------------------------------------------
        case "/pardonip": // ------------------------------> DEBUT COMMANDE "/pardonip" <---------------------------------------------
		  socket.cmd = 1;
          socket.perm = 0;
		  for (i=0; i<users.length; i++){
             if (users[i].pseudo == socket.pseudo & users[i].perm[4] == "1") {
                   socket.perm = 1;
             }
          }
          if (socket.perm == 1) {
			  var args = getargs(command);
			  if (typeof(args[0]) != "undefined" & args[0] != "") {
				  var p = 0;
				  for (i=0;i<banip.length;i++){
					  if (args[0] == banip[i].pseudo){
						  p = 1;
						  banip.splice(i);
					  }
				  }
				  if (p == 1){
					  socket.emit('msg', { pseudo: 'server', content: "L'utilisateur " + args[0] + " a été pardonné avec succès!", type: "msg", imp:"2" });
					  log(socket.pseudo,"/pardonip",args[0] + " a été pardonné avec succès",remplace(socket.handshake.address,"::ffff:",""));
				  } else {
					  socket.emit('msg', { pseudo: 'server', content: "L'utilisateur " + args[0] + " ne peut pas être pardonné car il n'est pas bannis!", type: "msg", imp:"3" });
					  log(socket.pseudo,"/pardonip",args[0] + " ne peut pas être pardonné car il n'est pas bannis",remplace(socket.handshake.address,"::ffff:",""));
				  }
			  } else {
				  socket.emit('msg', { pseudo: 'server', content: "La syntaxe de cette commande est : /pardonip 'le pseudo'", type: "msg", imp: "3" });
				  log(socket.pseudo,"/pardonip","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
			  }
		  } else {
			  socket.emit('msg', { pseudo: 'server', content: "Vous ne semblez pas avoir les permissions necéssaires.", type: "msg", imp: "3" });
			  log(socket.pseudo,"/pardonip","Permissions insuffisantes",remplace(socket.handshake.address,"::ffff:",""));
		  }
		  break; // -----------------------------------> FIN COMMANDE "/pardonip" <----------------------------------------------------------
		
		case "/alter": // -----------------------------> DEBUT COMMANDE "/alter" <-----------------------------------------------------------
		  socket.cmd = 1;
		  socket.perm = 0;
		  for (i=0; i<users.length; i++){
             if (users[i].pseudo == socket.pseudo & users[i].perm[5] == "1") {
                   socket.perm = 1;
             }
          }
          if (socket.perm == 1) {
			var args = getargs(command);
			var errors = new Array();
			var tpseudo = 0;
			var pseudo;
			var tpasswd = 0;
			var passwd;
			var tperm = 0;
			var perm;
			for (i=0;i<args.length;i++) {
			  if (remplace(args[i],":","") != args[i] & args[i].split(":")[0] == "passwd") {
				  if (typeof(passwd) == "undefined") {
				    passwd = args[i].split(":")[1];
				  } else {
					tpasswd = 1;
				  }
			  } else if (remplace(args[i],":","") != args[i] & (args[i].split(":")[0] == "perms" | args[i].split(":")[0] == "perm")) {
				  if (typeof(perm) == "undefined") {
				    perm = args[i].split(":")[1];
				  } else {
					tperm = 1;
				  }
			  } else if (remplace(args[i],":","") == args[i]) {
				  if (typeof(pseudo) == "undefined") {
				    pseudo = args[i];
				  } else {
					tpseudo = 1;
				  }
			  } else {
				  errors.push("L'argument '" + args[i].split(":")[0] + "' est inconnu.")
			  }
		    }
		    if (tpseudo == 1) {
		    	  errors.push("L'utilisateur a été renseigné plusieurs fois.");
		    }
		    if (tpasswd == 1) {
			      errors.push("le mot de passe a été renseigné plusieurs fois");
		    }
		    if (tperm == 1) {
			      errors.push("les permissions ont été renseignés plusieurs fois");
		    }
			if (typeof(pseudo) == "undefined") {
				  errors.push("L'utilisateur n'est pas renseigné.");
			}
			if (typeof(passwd) == "undefined" & typeof(perm) == "undefined") {
				  errors.push("Aucun argument à part le pseudo n'a été renseigné");
			}
            if (typeof(perm) != "undefined") {
			   if (perm.length != 6) {
				  errors.push("Les permissions doivent êtres composées de 6 bits");
			   }
			}			
		    if (errors.length == 0) {
			   var p = 0;
			   for (i=0;i<users.length;i++) {
				   if (pseudo == users[i].pseudo) {
					   p = 1;
				   }
			   }
			   if (p == 1) {
				 for (i=0;i<users.length;i++) {
					 if (users[i].pseudo == pseudo) {
						 if (typeof(passwd) != "undefined") {
							 users[i].passwd = md5(passwd);
							 con.query("UPDATE users set passwd='" + md5(passwd) + "' where pseudo='" + pseudo + "';");
						 }
						 if (typeof(perm) != "undefined") {
							 users[i].perm = perm;
							 con.query("UPDATE users set perm='" + perm + "' where pseudo='" + pseudo + "';");
						 }
					 }
				 }
				 socket.emit('msg', { pseudo: 'server', content: "L'utilisateur '" + pseudo + "' a été modifié avec succès!", type: "msg", imp: "2" });  
				 log(socket.pseudo,"/alter",pseudo + " a été modifié avec succès",remplace(socket.handshake.address,"::ffff:",""));
			   } else {
				 socket.emit('msg', { pseudo: 'server', content: "L'utilisateur '" + pseudo + "' n'existe pas.", type: "msg", imp: "3" });
				 log(socket.pseudo,"/alter",pseudo + " n'existe pas",remplace(socket.handshake.address,"::ffff:",""));
			   }
		    } else {
			   socket.emit('msg', { pseudo: 'server', content: "Syntaxe incorrecte", type: "msg", imp: "3" });
			   log(socket.pseudo,"/alter","Syntaxe incorrecte",remplace(socket.handshake.address,"::ffff:",""));
			   for (i=0;i<errors.length;i++) {
				  socket.emit('msg', { pseudo: 'server', content: errors[i], type: "msg", imp: "3" });
			   }   
			   socket.emit('msg', { pseudo: 'server', content: 'La syntaxe de cette commande est :<br>/alter "pseudo" "passwd:mot de passe" "perms:permissions"<br><br>permissions = 6 bits correspondant aux commandes: <br> /surlign  = 1er bit<br>/suppr = 2eme bit<br>/kick = 3eme bit<br>/ban et /pardon = 4eme bit<br>/banip et /pardonip = 5eme bit<br>/adduser, /userdel et /alter = 6eme bit<br> exemple : /alter toto passwd:abcdef$ perms:000001, toto pourras seulement utiliser les commandes /adduser, /userdel et /alter', type: "msg", imp: "4" });			
		    }
		  } else {
			 socket.emit('msg', { pseudo: 'server', content: "Vous ne semblez pas avoir les permissions necéssaires.", type: "msg", imp: "3" }); 
			 log(socket.pseudo,"/alter","Permissions insuffisantes",remplace(socket.handshake.address,"::ffff:",""));
		  }
		  break; // -----------------------------------> FIN COMMANDE "/alter" <-------------------------------------------------------------
		
	}
	if (socket.cmd == 0){
		socket.emit('msg', { pseudo: 'server', content: command[0] + " : Cette commande n'existe pas.", type: "msg", imp: "3" });
		log(socket.pseudo,command[0],"Cette commande n'existe pas.",remplace(socket.handshake.address,"::ffff:",""));
	}
}

function remplace(words,a,b) {
	while (words != words.replace(a,b)) {
		words = words.replace(a,b);
	}
    return words;
}

function getargs(command) {
	var args = new Array();
	var argtmp;
	var arg;
	for (i=1;i<command.length;i++) {
		if (command[i][0] == '"'){
			if (command[i][command[i].length-1] != '"') {
			  arg = remplace(command[i],'"','');
			  for (j=i+1;j<command.length;j++) {
				  argtmp = command[j];
				  if (command[j][command[j].length-1] == '"' | j == command.length-1) {
					 argtmp = remplace(argtmp,'"','');
					 i = j
					 j = command.length
					}
				  arg = arg + " " + argtmp;
				}
			  args.push(arg);
			} else {
			    args.push(remplace(command[i],'"',''));
		    }
		} else {
		   args.push(command[i]);
		}
	}
	return args;
}

function log(pseudo,context,msg,ip) {
	var date = new Date();
	console.log(date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate() + "  " + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ' => ' + context + ' => ' + pseudo + ' : ' + msg + ' (' + ip + ')');
}

function maintaincon(){
  setInterval(function () {
      con.query('SELECT 1');
  }, 1800000);
}

server.listen(801);