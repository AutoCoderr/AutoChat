    var socket = io.connect('http://' + location.hostname + ':' + location.port);
	$("#pseudo").select();
	var file;
	var reader;
	var windowopen = 1;
	var msgmissed = 0;
	var pseudo = "";
	var typemsg = "msg";
	var hist = new Array();
	var numhist = 0;
	var color = "#7D7D7D";
	var uid = NaN;
	//var ismobile = ismobile();
	var ch;
	var colorB;
	$(window).blur(function() { 
	  windowopen = 0;
	});
	$(window).focus(function() { 
	  windowopen = 1;
	  msgmissed = 0;
	  $("#title").empty();
	  $("#title").append("Chat en temps réel");
	});
	
	
	socket.on('msg', function(msg) {
	         /* if (typeof(pseudo) != "undefined" & msg.pseudo == pseudo) {
	            hist.push(msg.content);
	            numhist = hist.length;
              } */
			  if (msg.type == "command") {
			    $("#command").empty();
				$("#command").append(msg.content);
			  } else if (msg.type == "connect") {
				if (pseudo != "") {
				  if (document.getElementById("nobody")) {
					  $("#nobody").remove();
				  }
				  $("#connecteds").append("<tr id='" + msg.uid + "'><td style='text-align: center;'><font size='3' color='#" + msg.color + "'>" + msg.pseudo + "</font></td></tr>");
				}
			  } else if (msg.type == "disconnect") {
				  if (pseudo != "") {
				    $("#" + msg.uid).remove();
				    if (document.getElementById("connecteds").getElementsByTagName("tr").length == 1) {
				   	    $("#connecteds").append("<tr id='nobody'><td style='text-align: center;'><font size='3'>Personne</font></td></tr>");
				    }
				  }
			  }
			  if (typemsg == msg.type) {
	            ch = 0;
                if (color == "#BDBDBD")
				{
				  //color = "grey";
				  color = "#7D7D7D";
				}
				else if (color == "#7D7D7D")
				{
				  //color = "white";
				  color = "#BDBDBD";
				}
				switch(msg.imp) {
				  case "2":
				    ch = 1;
				    colorB = color;
				    color = "green";
					break;
				  case "3": 
				    ch = 1;
				    colorB = color;
				    color = "red";
					break;
				  case "4": 
				    ch = 1;
				    colorB = color;
				    color = "orange";
					break;
				  case "5": 
				    ch = 1;
				    colorB = color;
				    color = "yellow";
					break;
				}
				if (msg.pseudo == "server" | typeof(msg.color) == "undefined") {
					msg.css = "color: #000000;"
				} else if (msg.pseudo == pseudo) {
				  msg.css = "color: #FFFFFF; text-shadow: #000000 1px 1px, #000000 -1px 1px, #000000 -1px -1px, #000000 1px -1px;";
				} else {
				  msg.css = "color: #" + msg.color + "; text-shadow: #000000 1px 1px, #000000 -1px 1px, #000000 -1px -1px, #000000 1px -1px;";
				}
                if (typeof(msg.id) != "undefined" & msg.id != "") {
				  $("#aff").append("<tr id='msg" + msg.id +"' bgcolor='" + color + "'><td bgcolor='#003333'><font color='grey'>" + msg.id + "</font>  </td><td><strong><font size='4' style='" + msg.css + "'>" + msg.pseudo + ":</font></strong></td><td>" + msg.content + "</td></tr>");
				} else {
				  $("#aff").append("<tr bgcolor='" + color + "'><td bgcolor='#003333'></td><td><strong><font size='4' style='" + msg.css + "'>" + msg.pseudo + ":</font></strong></td><td>" + msg.content + "</td></tr>");
				}
				if (ch == 1)
				{
				   color = colorB;
				}
				
				if (msg.type == "msg") {
				  if (windowopen == 0) {
				     msgmissed += 1;
				     $("#title").empty();
				     $("#title").append("(" + msgmissed + ") Chat en temps reel");
				  }
				  if (pseudo != msg.pseudo & msg.pseudo != "server") {
				    document.querySelector('#bip').play();
				  }
				}
				window.scrollBy(0,10000);
				
			  }
				
            })
	/*function connect()
	{
	  var pseudo = document.getElementById("pseudo").value;
      $("#form").empty();
	  $("#form").append("<font color=white size='3'>envoie un message : </font><input type='text' id='msg'><input type='button' onclick='send();' value='envoyer'>");
	  // $("#aff").append("<input value='" + pseudo + "' type='hidden' id='pseudo'>");
	  socket.emit('new', pseudo);
	} */
	function connect()
	{
	  //pseudo = document.getElementById("pseudo").value;
	  socket.emit('new', document.getElementById("pseudo").value);
	  socket.on('new', function(info) {
	    if (info.avi == "NO")
		{
		   //alert(info.raison);
		   $("#pseudo").val('')
		}
		else if (info.avi == "OK")
		{
		  uid = info.uid;
	      formu(4);
		  $("#msg").select();
		  pseudo = info.pseudo;
		  $("#aff").empty();
		  $("#connecteds").append("<tr><td><font size='5' color='#A4A5A4'>connecté(e)s : </font></td></tr><tr id='nobody'><td style='text-align: center;'><font size='3'>Personne</font></td></tr>");
		  typemsg = "hist";
		  socket.emit('hist');
		  socket.on('hist', function() {
				typemsg = "msg";
			    window.scrollBy(0,10000);
		  });
	      // $("#aff").append("<input value='" + pseudo + "' type='hidden' id='pseudo'>");
		}
	  })
	}
	function connectpass()
	{
	   //pseudo = document.getElementById("pseudo").value;
	   //var passwd = document.getElementById("passwd").value;
	   socket.emit('newWpass', { pseudo: document.getElementById("pseudo").value, passwd: document.getElementById("passwd").value });
	   socket.on('newWpass', function(info) {
	    if (info.avi == "NO")
		{
		   //alert(info.raison);
		   $("#passwd").val('')
		}
		else if (info.avi == "OK")
		{
		  uid = info.uid;
	      formu(4);
		  $("#form").append("&nbsp;&nbsp;<input type='button' onclick='formu(3);' value='changer ton mot de passe'/>");
		  $("#connecteds").append("<tr><td><font size='5' color='#A4A5A4'>connecté(e)s : </font></td></tr><tr id='nobody'><td style='text-align: center;'><font size='3'>Personne</font></td></tr>");
		  $("#msg").select();
		  pseudo = info.pseudo;
		  $("#aff").empty();
		  typemsg = "hist";
		  socket.emit('hist');
		  socket.on('hist', function() {
				typemsg = "msg";
			    window.scrollBy(0,10000);
		  });
		}
	  })
	}
    function send()
	{
	  var msg = document.getElementById("msg").value;
	  // var pseudo = document.getElementById("pseudo").value;
	  $("#msg").val('');
	  //if (msg[0] == "/") {
	     hist.push(msg);
         numhist = hist.length;
	  // }
	  socket.emit('msg', msg);
	}
	
	function formu(truc)
	{
	  switch(truc) {
	    case 0:
		  $("#form").empty();
	      $("#form").append("<font color=white size='3'>Rentre ton pseudo : </font><input onKeyPress='if(event.keyCode == 13) connect();' type='text' id='pseudo'><br><br><input type='button' onclick='connect();' value='valider'/><br><br><br><br><br><br><table><tr><td><input type='button' onclick='formu(2);' value='Créer un compte'/></td><td><input type='button' onclick='formu(1);' value='Connexion avec mot de passe'/></td></tr></table>");
		  break;
	    case 1:
		  $("#form").empty();
          $("#form").append("<font color=white size='3'>Rentre ton pseudo : </font><input onKeyPress='if (event.keyCode == 13) connectpass();' type='text' id='pseudo'><br><font color=white size='3'>Rentre ton mot de passe : </font><input onKeyPress='if(event.keyCode == 13) connectpass();' type='password' id='passwd'><br><br><center><table><tr><td><input type='button' onclick='formu(0);' value='Annuler'/></td><td><input type='button' onclick='connectpass();' value='valider'/></td></tr></table></center><br><br><br><input type='button' onclick='formu(3);' value='changer ton mot de passe'/>");
		  break;
		case 2:
		  $("#form").empty();
		  $("#form").append("<font color=white size='3'>Rentre ton pseudo : </font><input onKeyPress='if (event.keyCode == 13) create_account();' type='text' id='pseudo'><br><font color=white size='3'>Rentre ton mot de passe : </font><input onKeyPress='if(event.keyCode == 13) create_account();' type='password' id='passwd'><br><font color=white size='3'>Rentre le de nouveau : </font><input onKeyPress='if(event.keyCode == 13) create_account();' type='password' id='rpasswd'><br><br><center><table><tr><td><input type='button' onclick='formu(0);' value='Annuler'/></td><td><input type='button' onclick='create_account();' value='Créer le compte'/></td></tr></table></center>");
		  break;
		case 3:
		  $("#form").empty();
		  $("#form").append("<font color=white size='3'>Rentre ton pseudo : </font><input onKeyPress='if (event.keyCode == 13) changepass();' type='text' id='pseudo'><br><font color=white size='3'>Rentre ton ancien mot de passe : </font><input onKeyPress='if(event.keyCode == 13) changepass();' type='password' id='oldpasswd'><br><font color=white size='3'>Rentre le nouveau mot de passe : </font><input onKeyPress='if(event.keyCode == 13) changepass();' type='password' id='passwd'><br><font color=white size='3'>Rentre le de nouveau : </font><input onKeyPress='if(event.keyCode == 13) changepass();' type='password' id='rpasswd'><br><br><center><table><tr><td><input type='button' onclick='formu(10)' value='Annuler'/></td><td><input type='button' onclick='changepass();' value='changer le mot de passe'/></td></tr></table></center>");
		  break;
		case 4:
		  $("#form").empty();
		  //$("#form").append("<font color=white size='3'>envoyer un message : </font><input onKeyPress='if(event.keyCode == 13) send();' onKeyUp='if(event.keyCode == 38) { hists(-1); } else if(event.keyCode == 40) { hists(1); }' type='text' id='msg'><input id='send' type='button' onclick='send();' value='envoyer'><input type='button' onclick='formu(5);' value='&#128206;'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<input type='button' onclick='window.location.reload();' value='Déconnexion'>");
		  $("#form").append("<input placeholder='Envoyer un message' onKeyPress='if(event.keyCode == 13) send();' onKeyUp='if(event.keyCode == 38) { hists(-1); } else if(event.keyCode == 40) { hists(1); }' type='text' id='msg'><input type='button' onclick='send();' value='&rarr;'>&nbsp;<img src='img.png' onclick='formu(5);' height='22px' style='margin-bottom:-7px;'><br><div id='upload'></div><br><br><input type='button' value='Déconnexion' onclick=window.location.reload(); pseudo = '';>");
		  break;
        case 5:
		  $("#upload").empty();
		  $("#upload").append("<br><div id='uploadform'><table><tr><td><input id='file' placeholder='image à uploader' accept='.jpg, .png, .jpeg, .gif, .bmp, .tif, .tiff' type='file'></td><td><input type='button' value='Upload' onclick='upload();'></td><td><input type='button' value='Annuler' onclick=$('#upload').empty();></td></tr></table></div><div id='uploadmsg'></div>");
		  document.getElementById('file').addEventListener('change', selectfile);
		  break;
		case 10:
		  if (pseudo != "") { 
		    formu(4);
            $("#form").append("&nbsp;&nbsp;<input type='button' onclick='formu(3);' value='changer ton mot de passe'/>");			
		  } else { 
		    formu(1); 
		  }
		  break;
	  }
	  $("#pseudo").select();
	}
	
	function create_account(){
	  if (document.getElementById("passwd").value == document.getElementById("rpasswd").value){
	    socket.emit("NewACC", { pseudo: document.getElementById("pseudo").value, passwd: document.getElementById("passwd").value });
		socket.on('NewACC', function(info) {
	    if (info.avi == "NO1")
		{
		   $("#pseudo").val('')
		   $("#passwd").val('')
		   $("#rpasswd").val('')
		}
		else if (info.avi == "NO2")
		{
		   formu(1);
		}
		else if (info.avi == "OK")
		{
		  uid = info.uid;
		  $("#msg").select();
		  pseudo = info.pseudo;
		  $("#aff").empty();
		  formu(4);
          $("#form").append("<br><br><br><input type='button' onclick='formu(3);' value='changer ton mot de passe'/>");
		  $("#connecteds").append("<tr><td><font size='5' color='#A4A5A4'>connecté(e)s : </font></td></tr><tr id='nobody'><td style='text-align: center;'><font size='3'>Personne</font></td></tr>");
		  typemsg = "hist";
		  socket.emit('hist');
		  socket.on('hist', function() {
				typemsg = "msg";
			    window.scrollBy(0,10000);
		  });
		}
	  })
	  } else {
	    $("#passwd").val('')
		$("#rpasswd").val('')
		$("#aff").append("<tr bgcolor='red'><td bgcolor='#003333'></td><td><strong><font size='4'>server:</font></strong></td><td>Vous n'avez pas rentrez deux fois le même mot de passe.</td></tr>");
	  }
	}
	
	function changepass(){
	  if (document.getElementById("passwd").value == document.getElementById("rpasswd").value){
	    socket.emit("changepass", { pseudo: document.getElementById("pseudo").value, oldpasswd: document.getElementById("oldpasswd").value, passwd: document.getElementById("passwd").value });
		socket.on('changepass', function(info) {
		  if (info.avi == "OK") {
		    formu(10);
		  } else if (info.avi == "NO") {
		    $("#pseudo").val('');
		    $("#oldpasswd").val('');
		    $("#passwd").val('');
		    $("#rpasswd").val('');
		  }
		})
	  } else {
	    $("#passwd").val('');
		$("#rpasswd").val('');
		$("#aff").append("<tr bgcolor='red'><td bgcolor='#003333'></td><td><strong><font size='4'>server:</font></strong></td><td>Vous n'avez pas rentrez deux fois le même nouveau mot de passe.</td></tr>");
	  }
	}
	
	function hists(op){
	  numhist = numhist + op;
	  if (numhist < 0) {
	     numhist = 0
	  } else if (numhist >= hist.length) {
	     numhist = hist.length - 1
	  }
	  $("#msg").val(hist[numhist]);
	}
	
	function selectfile(evnt){ file = evnt.target.files[0]; }
	
	function upload(){
	//.jpg, .png, .jpeg, .gif, .bmp, .tif, .tiff
	  if (document.getElementById("file").value != "") {
		  var ext = file.name.split(".")[file.name.split(".").length-1]
	      if (ext == "jpg"
		    | ext == "png"
			| ext == "jpeg"
			| ext == "gif"
			| ext == "bmp"
			| ext == "tif"
			| ext == "tiff") {
			if (file.size < 26214400) {
			  var filepart;
	          reader = new FileReader();
		      reader.onload = function(evnt){
                socket.emit('Upload', { size: file.size, name : file.name, data : evnt.target.result });
              }
              filepart = file.slice(0, Math.min(262144, file.size));
		      reader.readAsBinaryString(filepart);
			} else {
			  $("#uploadmsg").empty();
		      $("#uploadmsg").append("<font color='red' size='3'>Ce fichier est trop gros</font>");
			}
		  } else {
		    $("#uploadmsg").empty();
		    $("#uploadmsg").append("<font color='red' size='3'>Ce fichier n'est pas une image</font>");
		  }
	  } else {
	     $("#uploadmsg").empty();
		 $("#uploadmsg").append("<font color='red' size='5'>Aucun fichier choisi</font>");
	  }
	}
	
	socket.on('repupload', function (data){
	  if (data.type == "progress") {
	    $("#uploadmsg").empty();
	    $("#uploadform").empty();
	    $("#uploadmsg").append("<progress max='100' value='" + data.percent + "' form='form-id'>" + data.percent + "%</progress>");
        var filepart; //The Variable that will hold the new Block of Data
        filepart = file.slice(data.place, data.place + Math.min(262144, (file.size-data.place)));
        reader.readAsBinaryString(filepart);
	  } else if (data.type == "finish") {
	    $("#uploadmsg").empty();
		$("#uploadform").empty();
		$("#uploadmsg").append("<font color='green' size='3'>image envoyé</font>");
		window.scrollBy(0,10000);
	  } else if (data.type == 'refused') {
        $("#uploadmsg").empty();
        $("#uploadform").empty();
        $("#uploadmsg").append("<font color='red' size='3'>" + data.raison + "</font>");
        window.scrollBy(0,10000);
      }
    });
	function remplace(words,a,b) {
	  while (words != words.replace(a,b)) {
		  words = words.replace(a,b);
	  }
      return words;
    }
