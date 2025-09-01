
interface IShape {
  id: number,
  type: string,
  properties: JSON,
  userId: number,
}

export class RoomManager {
  private static _instance: RoomManager | null = null;

  private rooms: Record<string, Set<string>>;
  private shapes: Record<string, IShape[]>;

  private constructor(){
    this.rooms = {};
    this.shapes = {};
  }

  public static getInstance(): RoomManager{
    if(RoomManager._instance === null){
      RoomManager._instance = new RoomManager();
    }
    return RoomManager._instance;
  }

  public joinRoom(userId: string, roomId: string){
    if(!this.rooms[roomId]){
      this.rooms[roomId] = new Set<string>();
      this.shapes[roomId] = [];
    }

    if(!this.rooms[roomId].has(userId)){
      this.rooms[roomId].add(userId);
      // Send Message to all user
    }
  }

  public leaveRoom(userId: string, roomId: string){
    if(this.rooms[roomId] && this.rooms[roomId].has(userId)){
      this.rooms[roomId].delete(userId);
      // Send Message to all user

      if (this.rooms[roomId].size === 0) {
        delete this.rooms[roomId];
        delete this.shapes[roomId];
      }
    }
  }

  public addShape(){
    
  }
  
  public modifyShape(){

  }

  public updateShape(){

  }

  public getRoomMembers(roomId: string): string[] {
    return this.rooms[roomId] ? Array.from(this.rooms[roomId]) : [];
  }

  public getRoomMessages(roomId: string): IShape[] {
    return this.shapes[roomId] || [];
  }
}

export default RoomManager.getInstance();