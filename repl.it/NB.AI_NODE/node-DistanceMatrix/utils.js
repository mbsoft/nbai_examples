function colorize(color, output) {
    return ['\033[', color, 'm', output, '\033[0m'].join('');
}

module.exports = colorize;