import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";

export default class Scheduler implements IScheduler {

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let availableTimeslots: string[] = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100", "MWF 1100-1200",
            "MWF 1200-1300", "MWF 1300-1400", "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700", "TR  0800-0930",
            "TR  0930-1100", "TR  1100-1230", "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];
        let priorityQueueSections: any[] = this.sortSectionsByEnrollmentDecreasing(sections, availableTimeslots);
        let priorityQueueRooms: any[] = this.sortRoomsByDistanceIncreasing(rooms, availableTimeslots);
        let sectionsScheduled: {[courseDeptId: string]: string[]} = {};
        let finalSchedule: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        finalSchedule = this.doScheduling(priorityQueueSections, priorityQueueRooms, sectionsScheduled, finalSchedule);
        return finalSchedule;
    }

    private doScheduling(priorityQueueSections: any[], priorityQueueRooms: any[],
                         sectionsScheduled: { [p: string]: string[] },
                         finalSchedule: Array<[SchedRoom, SchedSection, TimeSlot]>):
        Array<[SchedRoom, SchedSection, TimeSlot]> {
        for (let section of priorityQueueSections) {
            let scheduledTuple: [SchedRoom, SchedSection, TimeSlot] = null;
            for (let room of priorityQueueRooms) {
                if (scheduledTuple !== null) {
                    break;
                }
                if (this.doesSectionFitInRoom(section, room)) {
                    let courseTimes: string[] = section["courseTimesAvail"];
                    let roomTimes: string[] = room["roomTimesAvail"];
                    if (roomTimes.length === 0) {
                        continue;
                    }
                    for (let availCourseTime of courseTimes) {
                        if (scheduledTuple !== null) {
                            break;
                        }
                        for (let availRoomTime of roomTimes) {
                            if (availCourseTime === availRoomTime) {
                                let booked: boolean = false;
                                let key = this.getSectionKey(section);
                                if (sectionsScheduled[key] === undefined) {
                                    scheduledTuple = this.setTuple(scheduledTuple, section, room, availCourseTime,
                                        finalSchedule, sectionsScheduled, key, roomTimes, courseTimes);
                                    break;
                                }
                                booked = this.checkBooked(sectionsScheduled, key, availCourseTime, booked);
                                if (!booked) {
                                    scheduledTuple = this.setTuple2(scheduledTuple, section, room, availCourseTime,
                                        finalSchedule, sectionsScheduled, key, roomTimes, courseTimes);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            if (scheduledTuple !== null) {
                continue;
            }
        }
        return finalSchedule;
    }

    private getSectionKey(section: any): string {
        return section[Object.keys(section)[0]].courses_dept +
            section[Object.keys(section)[0]].courses_id;
    }

    private checkBooked(sectionsScheduled: { [p: string]: string[] }, key: string, availCourseTime: string,
                        sameCourseBooked: boolean): boolean {
        for (let bookedTime of sectionsScheduled[key]) {
            if (availCourseTime === bookedTime) {
                sameCourseBooked = true;
            }
        }
        return sameCourseBooked;
    }

    private setTuple2(scheduledTuple: [SchedRoom, SchedSection, TimeSlot], section: any, room: any,
                      availCourseTime: string, finalSchedule: Array<[SchedRoom, SchedSection, TimeSlot]>,
                      sectionsScheduled: { [p: string]: string[] }, key: string, roomTimes: string[],
                      courseTimes: string[]) {
        scheduledTuple = [room[Object.keys(room)[0]], section[Object.keys(section)[0]],
            availCourseTime as TimeSlot];
        finalSchedule.push(scheduledTuple);
        sectionsScheduled[key].push(availCourseTime);
        roomTimes.splice(roomTimes.indexOf(availCourseTime), 1);
        courseTimes.splice(courseTimes.indexOf(availCourseTime), 1);
        return scheduledTuple;
    }

    private setTuple(scheduledTuple: [SchedRoom, SchedSection, TimeSlot], section: any, room: any,
                     availCourseTime: string, finalSchedule: Array<[SchedRoom, SchedSection, TimeSlot]>,
                     sectionsScheduled: { [p: string]: string[] }, key: string, roomTimes: string[],
                     courseTimes: string[]) {
        scheduledTuple = [room[Object.keys(room)[0]], section[Object.keys(section)[0]],
            availCourseTime as TimeSlot];
        finalSchedule.push(scheduledTuple);
        sectionsScheduled[key] = [availCourseTime];
        roomTimes.splice(roomTimes.indexOf(availCourseTime), 1);
        courseTimes.splice(courseTimes.indexOf(availCourseTime), 1);
        return scheduledTuple;
    }

    private convertToRad(num: number): number {
        return (num * Math.PI / 180);
    }

    private getHaversineD(room1: SchedRoom, room2: SchedRoom): number {
        let R: number = 6371000; // unit = metres, this is Earth's radius
        let lat: number = room2["rooms_lat"] - room1["rooms_lat"];
        let lon: number = room2["rooms_lon"] - room1["rooms_lon"];
        let dLat: number = this.convertToRad(lat);
        let dLon: number = this.convertToRad(lon);
        let a: number = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.convertToRad(room1["rooms_lat"]))
            * Math.cos(this.convertToRad(room2["rooms_lat"])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        let c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private doesSectionFitInRoom(section: any, room: any): boolean {
        let sectionObject: SchedSection = section[Object.keys(section)[0]];
        let sectionSum: number = sectionObject.courses_audit + sectionObject.courses_pass + sectionObject.courses_fail;
        let roomObject: SchedRoom = room[Object.keys(room)[0]];
        let roomSeats: number = roomObject.rooms_seats;
        return sectionSum <= roomSeats;
    }

    private sortRoomsByDistanceIncreasing(rooms: SchedRoom[], slotsPossible: string[]): any[] {
        let anchorRoom: SchedRoom = rooms[0];
        let priorityQueueRooms: SchedRoom[] = rooms.sort((roomA, roomB) => {
            let roomAtoAnchorDistance: number = this.getHaversineD(anchorRoom, roomA);
            let roomBtoAnchorDistance: number = this.getHaversineD(anchorRoom, roomB);
            return roomAtoAnchorDistance - roomBtoAnchorDistance;
        });
        let PQRoomsInit: any[] = [];
        priorityQueueRooms.forEach((room: SchedRoom) => {
            let temp: any = {};
            temp[room["rooms_shortname"] + room["rooms_number"]] = room;
            temp["roomTimesAvail"] = [...slotsPossible];
            PQRoomsInit.push(temp);
        });
        return PQRoomsInit;
    }

    private sortSectionsByEnrollmentDecreasing(sections: SchedSection[], slotsPossible: string[]): any[] {
        let priorityQueueSections: SchedSection[] = sections.sort(
            function (sectionA, sectionB) {
                return (sectionA.courses_audit + sectionA.courses_fail + sectionA.courses_pass) -
                    (sectionB.courses_audit + sectionB.courses_fail + sectionB.courses_pass);
            });
        priorityQueueSections.reverse();
        let PQSectionsInit: any[] = [];
        priorityQueueSections.forEach((section: SchedSection) => {
            let temp: any = {};
            temp[section["courses_dept"] + section["courses_id"]] = section;
            temp["courseTimesAvail"] = [...slotsPossible];
            PQSectionsInit.push(temp);
        });
        return PQSectionsInit;
    }
}
