/* eslint-disable camelcase */

import R from 'ramda'
import {
  GraphQLObjectType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLString,
} from 'graphql'

import { getXpos } from '@broad/utilities/lib/variant'

const coverageType = new GraphQLObjectType({
  name: 'Coverage',
  fields: () => ({
    // _id: { type: GraphQLString },
    // 10: { type: GraphQLFloat },
    xpos: { type: GraphQLFloat },
    // 15: { type: GraphQLFloat },
    // 25: { type: GraphQLFloat },
    // 30: { type: GraphQLFloat },
    // median: { type: GraphQLFloat },
    pos: { type: GraphQLFloat },
    // 50: { type: GraphQLFloat },
    // 1: { type: GraphQLFloat },
    // 5: { type: GraphQLFloat },
    // 20: { type: GraphQLFloat },
    // 100: { type: GraphQLFloat },
    mean: { type: GraphQLFloat },
  }),
})

const elasticFields = [
  'over50',
  'pos',
  'over20',
  'mean',
  'over10',
  'over15',
  'over5',
  'over1',
  'over25',
  'chrom',
  'median',
  'over30',
  'over100',
]

export default coverageType

export const lookupCoverageByStartStop = (db, collection, xstart, xstop) =>
  db.collection(collection).find({ xpos: { '$gte': Number(xstart), '$lte': Number(xstop) } }).toArray()

export const lookupCoverageByIntervals = ({ elasticClient, index, intervals, chrom }) => {
  const regionRangeQueries = intervals.map(({ start, stop }) => (
    { range: { pos: { gte: start, lte: stop } } }
  ))
  const fields = [
    'pos',
    'mean',
  ]
  return new Promise((resolve, _) => {
    elasticClient.search({
      index,
      type: 'position',
      size: 5000,
      _source: fields,
      body: {
        query: {
          bool: {
            filter: {
              bool: {
                should: regionRangeQueries,
              },
            },
          },
        },
        sort: [{ pos: { order: 'asc' } }],
      },
    }).then((response) => {
      resolve(response.hits.hits.map((position) => {
        const coverage_position = position._source
        // return coverage_position
        return {
          xpos: getXpos(chrom, coverage_position.pos),
          ...coverage_position,
        }
      }))
    })
  })
}

export const lookUpCoverageByExons = ({ elasticClient, index, exons, chrom }) => {
  const codingRegions = exons.filter(region => region.feature_type === 'CDS')
  return lookupCoverageByIntervals({ elasticClient, index, intervals: codingRegions, chrom })
}
