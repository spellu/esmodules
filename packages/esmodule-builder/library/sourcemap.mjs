import { SourceMapConsumer, SourceMapGenerator } from '#source-map';
export class SourceMap {
    constructor() {
        this._sources = [];
    }
    addSource(path, lines, lineStartNo = 1) {
        const source = {
            path,
            lines,
            lineStartNo,
            lineCount: lines.length,
        };
        this._sources.push(source);
    }
    sources() {
        return this._sources;
    }
    wholeContent() {
        return this._sources.map(_ => _.lines.join('\n') + '\n').join('');
    }
    getLocation(wholeLineNo) {
        let remain = wholeLineNo - 1;
        for (const source of this._sources) {
            if (remain >= source.lineCount) {
                remain -= source.lineCount;
                continue;
            }
            return {
                path: source.path,
                line: source.lineStartNo + remain,
            };
        }
        throw new Error('"wholeLineNo" is out of range.');
    }
    async originalSourceMap(wholeSourceMap) {
        const consumer = await new SourceMapConsumer(wholeSourceMap);
        const generator = new SourceMapGenerator({
            file: consumer.file,
            sourceRoot: '',
        });
        consumer.eachMapping(record => {
            if (record.source) {
                let { path, line } = this.getLocation(record.originalLine);
                const column = record.originalColumn;
                // console.log(11, record.originalLine, path, line, column)
                generator.addMapping({
                    generated: { line: record.generatedLine, column: record.generatedColumn },
                    original: { line: line, column: column },
                    source: path,
                    name: record.name,
                });
            }
            else {
                generator.addMapping({
                    generated: { line: record.generatedLine, column: record.generatedColumn },
                });
            }
        });
        return generator.toJSON();
    }
    createFileComment(sourceMap) {
        return `//# sourceMappingURL=${sourceMap.file}.map`;
    }
    createInlineComment(sourceMap) {
        const image = Buffer.from(JSON.stringify(sourceMap), 'ascii').toString('base64');
        return `//# sourceMappingURL=data:application/json;base64,${image}`;
    }
    toString() {
        return this._sources.map(_ => `${_.path}:${_.lineStartNo}:${_.lineCount}`).join('\n');
    }
}
export default SourceMap;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlbWFwLm1qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9zb3VyY2VtYXAubXRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBeUIsTUFBTSxhQUFhLENBQUE7QUFXMUYsTUFBTSxPQUFPLFNBQVM7SUFBdEI7UUErRlMsYUFBUSxHQUFhLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBL0ZBLFNBQVMsQ0FDUixJQUFZLEVBQ1osS0FBZSxFQUNmLGNBQXNCLENBQUM7UUFFdkIsTUFBTSxNQUFNLEdBQUc7WUFDZCxJQUFJO1lBQ0osS0FBSztZQUNMLFdBQVc7WUFDWCxTQUFTLEVBQUUsS0FBSyxDQUFDLE1BQU07U0FDdkIsQ0FBQTtRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRCxPQUFPO1FBRU4sT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxZQUFZO1FBRVgsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNsRSxDQUFDO0lBRUQsV0FBVyxDQUNWLFdBQW1CO1FBRW5CLElBQUksTUFBTSxHQUFHLFdBQVcsR0FBRyxDQUFDLENBQUE7UUFFNUIsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ25DLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUU7Z0JBQy9CLE1BQU0sSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFBO2dCQUMxQixTQUFRO2FBQ1I7WUFFRCxPQUFPO2dCQUNOLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtnQkFDakIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxXQUFXLEdBQUcsTUFBTTthQUNqQyxDQUFBO1NBQ0Q7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUIsQ0FDdEIsY0FBNEI7UUFFNUIsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRTVELE1BQU0sU0FBUyxHQUFHLElBQUksa0JBQWtCLENBQUM7WUFDeEMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO1lBQ25CLFVBQVUsRUFBRSxFQUFFO1NBQ2QsQ0FBQyxDQUFBO1FBRUYsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM3QixJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7Z0JBQ2xCLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQzFELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUE7Z0JBRXBDLDJEQUEyRDtnQkFFM0QsU0FBUyxDQUFDLFVBQVUsQ0FBQztvQkFDcEIsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxhQUFhLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxlQUFlLEVBQUU7b0JBQ3pFLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRTtvQkFDeEMsTUFBTSxFQUFFLElBQUk7b0JBQ1osSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO2lCQUNqQixDQUFDLENBQUE7YUFDRjtpQkFDSTtnQkFDSixTQUFTLENBQUMsVUFBVSxDQUFDO29CQUNwQixTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLGFBQWEsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLGVBQWUsRUFBRTtpQkFDOUQsQ0FBQyxDQUFBO2FBQ2I7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxTQUF1QjtRQUN4QyxPQUFPLHdCQUF3QixTQUFTLENBQUMsSUFBSSxNQUFNLENBQUE7SUFDcEQsQ0FBQztJQUVELG1CQUFtQixDQUFDLFNBQXVCO1FBQzFDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFaEYsT0FBTyxxREFBcUQsS0FBSyxFQUFFLENBQUE7SUFDcEUsQ0FBQztJQUVELFFBQVE7UUFFUCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3RGLENBQUM7Q0FHRDtBQUVELGVBQWUsU0FBUyxDQUFBIn0=