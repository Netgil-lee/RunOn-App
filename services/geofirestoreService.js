import { GeoFirestore } from 'geofirestore';
import { firestore } from '../config/firebase';

// GeoFirestore 인스턴스 생성
const geofirestore = new GeoFirestore(firestore);

export default geofirestore;
