import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import Log from "../Util";

let timeslots: any[] = [ "MWF 0800-0900" || "MWF 0900-1000" || "MWF 1000-1100" || "MWF 1100-1200" || "MWF 1200-1300" ||
"MWF 1300-1400" || "MWF 1400-1500" || "MWF 1500-1600" || "MWF 1600-1700" || "TR  0800-0930" || "TR  0930-1100" ||
"TR  1100-1230" || "TR  1230-1400" || "TR  1400-1530" || "TR  1530-1700"];

export default class SchedulerTestHelper {

   // helper functions for testing if outputted schedule 1) passes hard constraints / 2) has a good enough opt score
    public passHardConstraints(schedule: any[], sections: any[], rooms: any[]): boolean {
        if (schedule.length === 0) {
            return true;
        }
        if (this.containsInvalidItems(schedule, sections, rooms)) {
            // Log.trace("Failed because invalid sections/rooms/timeslots in timetable");
            return false;
        }
        if (!this.sectionsFitInRooms(schedule)) {
            // Log.trace("Failed because sections don't fit in rooms");
            return false;
        }
        if (this.roomsDoubleBooked(schedule)) {
            // Log.trace("Failed because room(s) are double booked");
            return false;
        }
        if (this.coursesOverlapping(schedule)) {
            // Log.trace("Failed because same course overlaps on a given timeslot");
            return false;
        }
        if (!this.sectionScheduledOnlyOnce(schedule)) {
            // Log.trace("Failed because a section got scheduled twice in final timetable");
            return false;
        }
        // Log.trace("Hard constraints are passing");
        return true;
    }

    private containsInvalidItems(schedule: any[], sections: any[], rooms: any[]): boolean {
        for (let tuple of schedule) {                       // look at each tuple within schedule array
            for (let j: number = 0; j < 3 ; j++) {     // look at rooms part of tuple, then section part, then timeslot
                let item: any = tuple[j];
                if (!sections.includes(item) && !rooms.includes(item) && !timeslots.includes(item)) {
                    return true;           // the item isn't one of sections/rooms provided, nor a valid timeslot
                }
            }
        }
        return false;
    }

    private sectionsFitInRooms(schedule: any[]): boolean {
        for (let tuple of schedule) {
            let room: any = tuple[0];
            let section: any = tuple[1];
            if (room["rooms_seats"] < section["courses_pass"] + section["courses_fail"] + section["courses_audit"]) {
                return false;
            }
        }
        return true;
    }

    private roomsDoubleBooked(schedule: any[]): boolean {
        for (let i: number = 0 ; i < schedule.length - 1 ; i++) {
            for (let j: number = i + 1 ; schedule.length ; j++) {
                if (schedule[i][0] === schedule[j][0] && schedule[i][2] === schedule[j][2]) {       // [0] = room
                    return true;                                                                    // [2] = timeslot
                }                                    // if room + timeslot match anything else in array = double booked
            }
        }
        return false;
    }

    private coursesOverlapping(schedule: any[]): boolean {
        for (let i: number = 0 ; i < schedule.length - 1 ; i++) {
            for (let j: number = i + 1 ; schedule.length ; j++) {
                let section: any = schedule[i][1];
                let sectionNext: any = schedule[j][1];
                if (section["courses_dept"] === sectionNext["courses_dept"]     // check if course dept/id match
                    && section["courses_id"] === sectionNext["courses_id"]) {
                    if (schedule[i][2] === schedule[j][2]) {            // if so, then check if timeslots are the same
                        return true;                                    // can't be same timeslots, so return true
                    }
                }
            }
        }
        return false;
    }

    private sectionScheduledOnlyOnce(schedule: any[]): boolean {
        for (let i: number = 0 ; i < schedule.length - 1 ; i++) {
            for (let j: number = i + 1 ; schedule.length ; j++) {
                if (schedule[i][1]["courses_uuid"] === schedule[j][1]["courses_uuid"]) {       // [1] = section
                    return false;           // uuid matches something else in array, so it was scheduled more than once
                }
            }
        }
        return true;
    }

    public calcOptimalityScore(schedule: any[], sections: any[]): number {
        let eScore: number = this.calculateE(schedule, sections);
        Log.trace("E score = " + eScore);
        let dScore: number = this.calculateD(schedule);
        let totalOptimalityScore: number = (0.7 * eScore + 0.3 * (1 - dScore));
        Log.trace("Total optimality score = " + totalOptimalityScore);
        return totalOptimalityScore;
    }

    private calculateE(schedule: any[], sections: any[]): number {
        let scheduledEnrollment: number = 0;
        for (let tuple of schedule) {
            let section: any = tuple[1];
            scheduledEnrollment = scheduledEnrollment + section["courses_pass"] + section["courses_fail"]
                + section["courses_audit"];
        }
        Log.trace("Scheduled enrollment = " + scheduledEnrollment);
        let totalEnrollment: number = 0;
        for (let section of sections) {
            totalEnrollment = totalEnrollment + section["courses_pass"] + section["courses_fail"]
                + section["courses_audit"];
        }
        Log.trace("Total enrollment = " + totalEnrollment);
        return scheduledEnrollment / totalEnrollment;
    }

    private calculateD(schedule: any[]): number {
        if (schedule.length === 0) {
            Log.trace("Empty timetable");
            return Infinity;
        }
        if (schedule.length === 1) {
            Log.trace("Just one building/section in timetable");
            return 0;
        }
        let buildingsInTimetable: any = [];
        for (let tuple of schedule) {
            let room: any = tuple[0];
            if (!buildingsInTimetable.includes(room["rooms_shortname"])) {
                buildingsInTimetable.push(room["rooms_shortname"]);
            }
        }
        if (buildingsInTimetable.length === 1) {
            Log.trace("Just one building within timetable");
            return 0;
        }
        let maxHaversineD: number = 0;
        for (let i: number = 0; i < schedule.length - 1; i++) {
            for (let j: number = i + 1; j < schedule.length; j++) {
                let room1: any = schedule[i][0];
                let room2: any = schedule[j][0];
                let d: number = this.getHaversineD(room1, room2);
                if (d > maxHaversineD) {
                    maxHaversineD = d;
                }
            }
        }
        Log.trace("Max Haversine D = " + maxHaversineD);
        return maxHaversineD / 1.372;       // distance divided by 1372 meters to get it between 0 and 1
    }

    private getHaversineD(room1: SchedRoom, room2: SchedRoom): number {
        let R: number = 6371000;    // unit = metres, this is Earth's radius
        let lat: number = room2["rooms_lat"] - room1["rooms_lat"];
        let lon: number = room2["rooms_lon"] - room1["rooms_lon"];
        let dLat: number = this.convertToRad(lat);
        let dLon: number = this.convertToRad(lon);
        let a: number = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.convertToRad(room1["rooms_lat"]))
            * Math.cos(this.convertToRad(room2["rooms_lat"])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        let c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private convertToRad(num: number): number {
        return (num * Math.PI / 180);
    }
}
