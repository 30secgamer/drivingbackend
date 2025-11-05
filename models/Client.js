import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  firstName: { type: String },
  mobile: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  applicationNo: { type: String },
  photo: { type: String },
  phone: { type: String },
  relation: { type: String },
  permanentAddress: { type: String },
  temporaryAddress: { type: String },
  dob: { type: Date },
  classOfVehicle: { type: String },
  dateOfEnrolment: { type: Date },
  learnersLicenseNo: { type: String },
  expiryOfLL: { type: Date },
  mainTestDate: { type: Date },
  licenseFile: { type: String },

  // New fields
  totalFee: { type: Number, default: 0 },
  paidFee: { type: Number, default: 0 },
  feeDiscount: { type: Number, default: 0 },
  totalClasses: { type: Number, default: 0 },
  classesAttended: { type: Number, default: 0 },
});

export default mongoose.model("Client", clientSchema);
