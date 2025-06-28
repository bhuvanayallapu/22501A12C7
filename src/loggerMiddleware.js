export class Logger {
  static logs = [];

  static log(eventType, details) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, eventType, details };
    Logger.logs.push(logEntry);
  }

  static getLogs() {
    return Logger.logs;
  }
}