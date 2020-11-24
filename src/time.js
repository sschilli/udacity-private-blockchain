/**
 * Helper class to create a formatted standard timestamp for the current time.
 */

class Time {
    static now() {
        return parseInt(new Date().getTime().toString().slice(0, -3));
    }
}

module.exports = Time;