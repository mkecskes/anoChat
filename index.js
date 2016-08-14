var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.use(express.static("static"));
app.use(express.static("node_modules/linkifyjs/dist"));

var waitingPartners = {};
var activeConvos = {};
var eggs = ["nyan", "hampsterdance"];

io.on("connection", function(socket) {
    var userData = {};
    socket.on("seek", function(gender, age, seekGender, ageFrom, ageTo) {
        // storing data in case of reconnecting
        userData.gender = gender;
        userData.age = age;
        userData.seekGender = seekGender;
        userData.ageFrom = ageFrom;
        userData.ageTo = ageTo;
        
        seekPartner(socket, gender, age, seekGender, ageFrom, ageTo);
    });
    
    socket.on("disconnect", function() {
        withPartner(socket.id, function(partnerId) {
            socket.broadcast.to(partnerId).emit("logout");
            delete activeConvos[partnerId];
        });
        delete waitingPartners[socket.id];
        delete activeConvos[socket.id];
    });
    
    socket.on("exit", function() {
        withPartner(socket.id, function(partnerId) {
            socket.broadcast.to(partnerId).emit("logout");
            delete activeConvos[partnerId];
        });
        delete waitingPartners[socket.id];
        delete activeConvos[socket.id];
    });
    
    socket.on("new chat", function() {
        seekPartner(socket, userData.gender, userData.age,
            userData.seekGender, userData.ageFrom, userData.ageTo);
    });
    
    socket.on("message", function(msg) {
        withPartner(socket.id, function(partnerId, msg) {
            if (msg.charAt(0) === "/" && eggs.indexOf(msg.slice(1)) > -1) {
                socket.broadcast.to(partnerId).emit("egg", msg.slice(1));
            } else {
                socket.broadcast.to(partnerId).emit("message", msg);
            }
        }, msg);
    });
    
    socket.on("typing start", function() {
        withPartner(socket.id, function(partnerId) {
            socket.broadcast.to(partnerId).emit("typing start");
        });
    });
    
    socket.on("typing end", function() {
        withPartner(socket.id, function(partnerId) {
            socket.broadcast.to(partnerId).emit("typing end");
        });
    });
});

http.listen(process.env.PORT || 8080);

function seekPartner(socket, gender, age, seekGender, ageFrom, ageTo) {
    var partnerIds = Object.keys(waitingPartners);
    var i = 0;
    var partner;
    while (
        i < partnerIds.length &&
        (partner = waitingPartners[partnerIds[i]]) &&
        (seekGender !== "both" && partner.gender !== seekGender ||
        partner.age < ageFrom ||
        partner.age > ageTo ||
        partner.seekGender !== "both" && partner.seekGender !== gender ||
        partner.ageFrom > age ||
        partner.ageTo < age)
    ) {
        i++;
    }
    
    if (i === partnerIds.length) {
        socket.emit("waiting");
        addToWaiting(socket.id, gender, age, seekGender, ageFrom, ageTo);
    } else {
        delete waitingPartners[partnerIds[i]];
        addToActive(socket.id, partnerIds[i]);
        socket.emit("found", partner.gender, partner.age);
        socket.broadcast.to(partnerIds[i]).emit("found", gender, age);
    }
}

function addToWaiting(id, gender, age, seekGender, ageFrom, ageTo) {
    waitingPartners[id] = {
        gender: gender,
        age: age,
        seekGender: seekGender,
        ageFrom: ageFrom,
        ageTo: ageTo
    };
}

function addToActive(id1, id2) {
    activeConvos[id1] = id2;
    activeConvos[id2] = id1;
}

function withPartner(socketId, callback, msg) {
    if (activeConvos[socketId]) {
        callback(activeConvos[socketId], msg);
    }
}