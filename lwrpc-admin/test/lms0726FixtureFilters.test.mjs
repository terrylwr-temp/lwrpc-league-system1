import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {dashboardFixtureSql,queryNormalDashboardFixture} from './helpers/normalDashboardFixtureQuery.mjs';

const selection='id,match_lines!inner(matches!inner(league_id,division_id,score_status))';
function params(division='10',league='1',status='verified') {
  return new URLSearchParams({select:selection,'match_lines.matches.league_id':`in.(${league})`,
    'match_lines.matches.division_id':`in.(${division})`,'match_lines.matches.score_status':`eq.${status}`,
    or:'(home_score.not.is.null,away_score.not.is.null,game_status.not.is.null)'});
}
test('0726 fixture nested inner count evaluates null/empty/zero, scope AND OR, and missing joins with PostgreSQL',async()=>{
 const db=new PGlite();try{
  await db.exec(`create table matches(id int,league_id int,division_id int,score_status text);
   create table match_lines(id int,match_id int);create table line_games(id int,match_line_id int,home_score int,away_score int,game_status text);
   insert into matches values(1,1,10,'verified'),(2,1,20,'verified'),(3,2,10,'verified'),(4,1,10,'pending'),(5,1,10,null);
   insert into match_lines values(1,1),(2,2),(3,3),(4,4),(5,5),(6,999);
   insert into line_games values(1,1,0,null,null),(2,1,null,11,null),(3,1,null,null,''),(4,1,null,null,null),
   (5,2,1,null,null),(6,3,1,null,null),(7,4,1,null,null),(8,5,1,null,null),(9,6,1,null,null),(10,999,1,null,null),(11,null,1,null,null);`);
  for(const [division,league,status,expected] of [['10','1','verified',[1,2,3]],['20','1','verified',[5]],['10','2','verified',[6]],['10','1','pending',[7]],['99','1','verified',[]],['','1','verified',[]]]){
   const result=await queryNormalDashboardFixture(db,params(division,league,status));
   assert.deepEqual(result.data.map(r=>r.id),expected);assert.equal(result.count,expected.length);
   const oracle=await db.query(`select g.id from line_games g inner join match_lines ml on g.match_line_id=ml.id
    inner join matches m on ml.match_id=m.id where m.league_id::text=$1 and m.division_id::text=$2
    and m.score_status=$3 and (g.home_score is not null or g.away_score is not null or g.game_status is not null) order by g.id`,[league,division,status]);
   assert.deepEqual(result.data.map(r=>r.id),oracle.rows.map(r=>r.id));
  }
  const multi=params('10,20');assert.deepEqual((await queryNormalDashboardFixture(db,multi)).data.map(r=>r.id),[1,2,3,5]);
  const nulls=params();nulls.set('or','(home_score.is.null)');assert.deepEqual((await queryNormalDashboardFixture(db,nulls)).data.map(r=>r.id),[2,3,4]);
  await db.exec('delete from line_games');assert.equal((await queryNormalDashboardFixture(db,params())).count,0);
 }finally{await db.close();}
});
test('0726 fixture rejects unknown operators/selections instead of guessing results',()=>{
 for(const change of [{or:'(home_score.unknown.null)'},{select:'*'},{'unrelated.id':'eq.1'},{'match_lines.matches.league_id':'in.(1);delete)'}]){
  const p=params();for(const [k,v]of Object.entries(change))p.set(k,v);assert.throws(()=>dashboardFixtureSql(p));
 }
});
