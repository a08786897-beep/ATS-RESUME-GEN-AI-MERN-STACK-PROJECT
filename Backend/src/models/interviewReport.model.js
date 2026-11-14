const mongoose = require("mongoose");

const TecnicalInterviewSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Tecnical question required"],
    },
    intention: {
      type: String,
      required: [true, "intention is required"],
    },
    answer: {
      type: String,
      required: [true, "Answer is required"],
    },
  },
  {
    _id: false,
  },
);

const behavioralQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Tecnical question required"],
    },
    intention: {
      type: String,
      required: [true, "intention is required"],
    },
    answer: {
      type: String,
      required: [true, "Answer is required"],
    },
  },
  {
    _id: false,
  },
);

const SkillGapSchema = new mongoose.Schema(
  {
    skill: {
      type: String,
      required: [true, "skill is required"],
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: [true, "severity is required"],
    },
  },
  {
    _id: false,
  },
);

const preparationPlanSchema = new mongoose.Schema({
  day: {
    type: Number,
    required: [true, "Day is required"],
  },
  focus: {
    type: String,
    required: [true, "Focus is required"],
  },
  tasks: [
    {
      type: String,
      required: [true, "tasks is required"],
    },
  ],
});

const interviewReportSchema = new mongoose.Schema({
  jobDescription: {
    type: String,
    required: [true, "job Description id required"],
  },
  resume: {
    type: String,
  },
  selfDescription: {
    type: String,
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  technicalQuestion:[TecnicalInterviewSchema],
  behavioralQuestion:[behavioralQuestionSchema],
  skilGaps:[SkillGapSchema],
  preparationPlan:[preparationPlanSchema]
},{
    timestamps:true
});

const interviewReportModel=mongoose.model("InterviewReport",interviewReportSchema);

module.exports=interviewReportModel;
