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
    socket.on("seek", function(gender, age, seekGender, ageFrom, ageTo) {
        var partner = seekPartner(socket.id, gender, age, seekGender, ageFrom, ageTo);
        if (partner) {
            socket.emit("found", partner.gender, partner.age);
            socket.broadcast.to(partner.id).emit("found", gender, age);
        } else {
            socket.emit("waiting");
            addToWaiting(socket.id, gender, age, seekGender, ageFrom, ageTo);
        }
    });
    
    socket.on("exit", function() {
        withPartner(socket.id, function(partnerId) {
            socket.broadcast.to(partnerId).emit("logout");
            delete activeConvos[partnerId];
        });
        delete activeConvos[socket.id];
    });
    
    socket.on("disconnect", function() {
        withPartner(socket.id, function(partnerId) {
            socket.broadcast.to(partnerId).emit("logout");
            delete activeConvos[partnerId];
        });
        delete activeConvos[socket.id];
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

function seekPartner(id, gender, age, seekGender, ageFrom, ageTo) {
    for (var partnerId in waitingPartners) {
        var partner = waitingPartners[partnerId];
        if (
            (seekGender === "both" || partner.gender === seekGender) &&
            partner.age >= ageFrom &&
            partner.age <= ageTo &&
            (partner.seekGender === "both" || partner.seekGender === gender) &&
            partner.ageFrom <= age &&
            partner.ageTo >= age
        ) {
            delete waitingPartners[partnerId]; // we have to store the user's data on client side in case of reconnecting, because we don't store them at server side (or we have to do that)
            addToActive(id, partnerId);
            return {id: partnerId, age: partner.age, gender: partner.gender};
        }
    }
    return false;
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