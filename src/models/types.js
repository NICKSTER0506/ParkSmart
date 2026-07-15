// Data models for ParkSmart app

export class ParkingSpot {
  constructor(id, latitude, longitude, status = 'free', type = 'street', pricePerHour = 0, reportedBy = '', verified = false) {
    this.id = id;
    this.latitude = latitude;
    this.longitude = longitude;
    this.status = status; // free, occupied, reserved
    this.type = type; // street, mall, office, etc.
    this.pricePerHour = pricePerHour;
    this.reportedBy = reportedBy;
    this.verified = verified;
    this.timestamp = Date.now();
  }
}

export class Booking {
  constructor(spotId, userId, hours, totalPrice, paymentId = null) {
    this.spotId = spotId;
    this.userId = userId;
    this.hours = hours;
    this.totalPrice = totalPrice;
    this.paymentId = paymentId;
    this.status = 'active'; // active, completed, cancelled
    this.createdAt = Date.now();
    this.startTime = Date.now();
    this.endTime = Date.now() + hours * 3600000;
  }
}

export class User {
  constructor(uid, email, name = '', phone = '') {
    this.uid = uid;
    this.email = email;
    this.name = name;
    this.phone = phone;
    this.reputation = 0; // for community reporting
    this.totalBookings = 0;
    this.createdAt = Date.now();
  }
}

export class Report {
  constructor(userId, latitude, longitude, type = 'illegal_parking', description = '', photoUri = null) {
    this.userId = userId;
    this.latitude = latitude;
    this.longitude = longitude;
    this.type = type;
    this.description = description;
    this.photoUri = photoUri;
    this.verified = false;
    this.upvotes = 0;
    this.timestamp = Date.now();
  }
}
