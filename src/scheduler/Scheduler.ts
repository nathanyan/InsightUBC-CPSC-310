import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";

export default class Scheduler implements IScheduler {

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let availableTimeslots: string[] = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100", "MWF 1100-1200",
            "MWF 1200-1300", "MWF 1300-1400", "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700", "TR  0800-0930",
            "TR  0930-1100", "TR  1100-1230", "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];
        let priorityQueueSections: SchedSection[] = this.sortSectionsByEnrollmentDecreasing(sections);
        let priorityQueueRooms: SchedRoom[] = this.sortRoomsByCapacityDecreasing(rooms);
        let roomsAndSectionPairs: Array<[SchedRoom, SchedSection]> = [];
        let maxDistance: number = this.getMaxDistanceFromAllRooms(rooms);
        let roomsScheduled: SchedRoom[] = [];
        // first pair sections with rooms
        priorityQueueSections.forEach((section: any) => {
            let counter: number = 0;
            let bestRoomSoFarIndex: number = null;
            let maxDistanceSoFar: number;
            priorityQueueRooms.forEach((room: any) => {
                if (this.doesSectionFitInRoom(section, room)) {
                    if (roomsScheduled.length === 0) {
                        bestRoomSoFarIndex = counter;
                        counter++;
                    }
                    if (roomsScheduled.length === 1) {
                        bestRoomSoFarIndex = counter;
                        maxDistanceSoFar = this.getHaversineD(roomsScheduled[0], room);
                        counter++;
                    }
                    if (roomsScheduled.length > 1) {
                        for (let scheduledRoom of roomsScheduled) {
                            let temp: number = this.getHaversineD(scheduledRoom, room);
                            if (temp < maxDistanceSoFar && temp < maxDistance) {
                                bestRoomSoFarIndex = room;
                                maxDistanceSoFar = temp;
                                counter++;
                            }
                        }
                    }
                } else {
                    counter++;
                }
            });
            let scheduledDuple: [SchedRoom, SchedSection] = [priorityQueueRooms[bestRoomSoFarIndex], section];
            if (this.getDupleSection(scheduledDuple) !== undefined && this.getDupleRoom(scheduledDuple) !== undefined) {
                roomsAndSectionPairs.push(scheduledDuple);
                roomsScheduled.push(priorityQueueRooms[bestRoomSoFarIndex]);
                priorityQueueRooms.splice(bestRoomSoFarIndex, 1);
            }
        });
        // then do timeslot optimization
        return this.matchTimeSlots(availableTimeslots, roomsAndSectionPairs);
    }

    private matchTimeSlots(availableTimeslots: string[], roomsAndSectionPairs: Array<[SchedRoom, SchedSection]>):
        Array<[SchedRoom, SchedSection, TimeSlot]> {
        let scheduledTimeSlots: {[timeslot: string]: string[]} = {}; // inline type
        scheduledTimeSlots = this.initializeTimeslotsToSchedule(availableTimeslots, scheduledTimeSlots);
        let finalSchedule: Array<[SchedRoom, SchedSection, TimeSlot]> = [];

        roomsAndSectionPairs.forEach((duple: [SchedRoom, SchedSection]) => {
            let scheduledTuple: [SchedRoom, SchedSection, TimeSlot] = null;
            for (let timeslot of availableTimeslots) {
                scheduledTuple = this.scheduleTime(scheduledTimeSlots, scheduledTuple, duple, timeslot);
                if (scheduledTuple === null) {
                    continue;
                } else {
                    break;
                }
            }
            if (scheduledTuple === null) {
                // don't push RoomCourse pair to finalSchedule;
            } else {
                finalSchedule.push(scheduledTuple);
            }
        });
        return finalSchedule;
    }

    private scheduleTime(scheduledTimeSlots: {[timeslot: string]: string[]},
                         scheduledTuple: [SchedRoom, SchedSection, TimeSlot],
                         duple: [SchedRoom, SchedSection], timeslot: string):
        [SchedRoom, SchedSection, TimeSlot] {
            if (scheduledTimeSlots[timeslot].length === 0) {
                scheduledTuple = [this.getDupleRoom(duple), this.getDupleSection(duple), timeslot as TimeSlot];
                scheduledTimeSlots[timeslot] =
                    scheduledTimeSlots[timeslot].concat(this.getDupleSection(duple)["courses_dept"] +
                        this.getDupleSection(duple)["courses_id"]);
            }
            if (scheduledTimeSlots[timeslot].length >= 1) { // i think this is wrong
                let sameCourseInTimeslot: boolean = false;
                scheduledTimeSlots[timeslot].forEach((courseID: string) => {
                    if ((this.getDupleSection(duple)["courses_dept"] + this.getDupleSection(duple)["courses_id"]) ===
                        courseID) {
                        sameCourseInTimeslot = true;
                    }
                });
                if (!sameCourseInTimeslot) {
                    scheduledTuple = [this.getDupleRoom(duple), this.getDupleSection(duple),
                        timeslot as TimeSlot];
                    scheduledTimeSlots[timeslot] =
                        scheduledTimeSlots[timeslot].concat(this.getDupleSection(duple)["courses_id"]);
                }
            }
            return scheduledTuple;
    }

    private initializeTimeslotsToSchedule(availableTimeslots: string[], timeslotsAlreadyScheduled: any): any {
        for (let timeslot of availableTimeslots) {
            timeslotsAlreadyScheduled[timeslot] = [];
        }
        return timeslotsAlreadyScheduled;
    }

    private getDupleRoom(duple: [SchedRoom, SchedSection]): SchedRoom {
        return duple[0];
    }

    private getDupleSection(duple: [SchedRoom, SchedSection]): SchedSection {
        return duple[1];
    }

    private convertToRad(num: number): number {
        return (num * Math.PI / 180);
    }

    private getMaxDistanceFromAllRooms(rooms: SchedRoom[]): number {
        let maxDistanceSoFar: number;
        if (rooms.length === 0 || rooms.length === 1) {
            maxDistanceSoFar = 0;
        } else {
            let room1: SchedRoom = rooms[0];
            let room2: SchedRoom = rooms[1];
            maxDistanceSoFar = this.getHaversineD(room1, room2);
            let roomsConsidered: SchedRoom[] = [];
            roomsConsidered.push(room1, room2);

            for (let i = 2; i < rooms.length; i++) {
                for (let room of roomsConsidered) {
                    let d: number = this.getHaversineD(rooms[i], room);
                    if (d < maxDistanceSoFar) {
                        maxDistanceSoFar = d;
                    }
                }
            }
        }
        return maxDistanceSoFar;
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
        return (section["courses_audit"] + section["courses_pass"] + section["courses_fail"]) <=
            room["rooms_seats"];
    }

    private sortRoomsByCapacityDecreasing(rooms: SchedRoom[]): SchedRoom[] {
        let priorityQueueRooms: SchedRoom[] = rooms.sort(function (roomA, roomB) {
            return (roomA.rooms_seats) - (roomB.rooms_seats);
        });
        priorityQueueRooms.reverse();
        return priorityQueueRooms;
    }

    private sortSectionsByEnrollmentDecreasing(sections: SchedSection[]): SchedSection[] {
        let priorityQueueSections: SchedSection[] = sections.sort(
            function (sectionA, sectionB) {
                return (sectionA.courses_audit + sectionA.courses_fail + sectionA.courses_pass) -
                    (sectionB.courses_audit + sectionB.courses_fail + sectionB.courses_pass);
            });
        priorityQueueSections.reverse();
        return priorityQueueSections;
    }
}
