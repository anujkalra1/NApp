module.exports.getDateFromTimetime = () => {
    let currentDate = new Date();
    let date = currentDate.getDate();
    let month = currentDate.getMonth() + 1;
    let year = currentDate.getFullYear();
    let hours = currentDate.getHours();
    let minutes = currentDate.getMinutes();
    let seconds = currentDate.getSeconds();
    let currentDateTime = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
    return currentDateTime;
}