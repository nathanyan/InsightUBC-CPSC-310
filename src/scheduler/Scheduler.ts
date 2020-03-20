import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";

export default class Scheduler implements IScheduler {

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        // TODO Implement this
        let timeslotsAlreadyScheduled: any = {};
        let availableTimeslots: string[] = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100", "MWF 1100-1200",
            "MWF 1200-1300", "MWF 1300-1400", "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700", "TR  0800-0930",
            "TR  0930-1100", "TR  1100-1230", "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];
        let schedule: any[] = [];
        for (let section of sections) {
            let counter: number = 0;
            let roomToSelect: number = 0;
            let seatsLeft = 1000000;
            for (let room of rooms) {
                if (this.isSectionLargerThanRoomCapacity(section, room)) {
                    counter++;
                    continue;
                }
                if (this.isEnrollmentMaximized(room, section, seatsLeft)) {
                    roomToSelect = counter;
                    seatsLeft = room["rooms_seats"] - (section["courses_pass"] + section["courses_fail"] +
                        section["courses_audit"]);
                }
            }
            let finalTimeslot: string = "";
            for (let availableSlot of availableTimeslots) {
                for (let timeslot of Object.values(timeslotsAlreadyScheduled)) {
                    if (availableSlot !== timeslot) {
                        finalTimeslot = availableSlot;
                        let scheduledTuple: [SchedSection, SchedRoom, string] =
                            [section, rooms[roomToSelect], finalTimeslot];
                        rooms.splice(roomToSelect, 1);
                        timeslotsAlreadyScheduled[finalTimeslot] = section["courses_id"];
                        schedule.push(scheduledTuple);
                        break;
                    } else {
                        for (let course of timeslotsAlreadyScheduled[timeslot]) {
                            if (course["courses_id"] === section["courses_id"]) {
                                break;
                            }
                            finalTimeslot = availableSlot;
                            let scheduledTuple: [SchedSection, SchedRoom, string] =
                                [section, rooms[roomToSelect], finalTimeslot];
                            rooms.splice(roomToSelect, 1);
                            timeslotsAlreadyScheduled[finalTimeslot] = section["courses_id"];
                            schedule.push(scheduledTuple);
                        }
                    }
                }
            }
        }
        return schedule;
    }

    private isEnrollmentMaximized(room: SchedRoom, section: SchedSection, seatsLeft: number): boolean {
        return room["rooms_seats"] - (section["courses_pass"] + section["courses_fail"] +
            section["courses_audit"]) < seatsLeft;
    }

    private isSectionLargerThanRoomCapacity(section: SchedSection, room: SchedRoom): boolean {
        return (section["courses_pass"] + section["courses_fail"] + section["courses_audit"]) >
            room["rooms_seats"];
    }
}
